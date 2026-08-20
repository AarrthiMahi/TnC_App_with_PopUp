const cds = require('@sap/cds');
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");


/** Local mocked-auth does not have a real IAS login session.
 * One temporary session ID is therefore created per CAP server run.*/
const LOCAL_BOOT_SESSION_ID = crypto.randomUUID();

module.exports = cds.service.impl(async function () {

    const { TCVersionMaster, TCActionLog, ChangeLog } = cds.entities('hpbuysell.adm.tncmgmt');
    const { SELECT, INSERT, UPSERT } = cds.ql;

    this.on('getApplicableTC', async (req) => {

        // User profile will come from IAS later
        const profile = req.user?.attr?.profile ?? {};

        console.log("===== T&C USER =====",
            {
                id: req.user.id,
                profile: req.user?.attr?.profile,
                email: req.user?.attr?.email,
                roles: req.user.roles
            }
        );

        // HP internal users do not need T&C popup
        if (profile === 'HP') {
            return [];
        }

        const queue = [];

        // Customer -> SALES T&C
        if (profile === 'C') {
            queue.push('SALES');
        }

        // Supplier -> PURCHASING T&C
        if (profile === 'S') {
            queue.push('PURCHASING');
        }

        // Customer + Supplier -> SALES first, then PURCHASING
        if (profile === 'CS') {
            queue.push('SALES');
            queue.push('PURCHASING');
        }

        const result = [];

        for (const tcType of queue) {

            const activeVersions = await SELECT
                .from(TCVersionMaster)
                .where({
                    tcType,
                    status: 'ACTIVE'
                });

            result.push({
                tcType,
                subTypes: activeVersions.map(version => ({
                    tcSubType: version.tcSubType,
                    tcVersionId: version.ID,
                    versionNumber: version.versionNumber,
                    documentPath: version.documentPath,
                    fileName: version.fileName
                }))
            });
        }

        return result;
    });

    this.on('submitTCAction', async (req) => {
        const { tcType, decision, subTypes } = req.data;
        const userEmail = req.user?.attr?.email || req.user.id;
        const profile = req.user?.attr?.profile;

        const firstName = req.user?.attr?.firstName || null;
        const lastName = req.user?.attr?.lastName || null;

        const now = new Date().toISOString();

        // -----------------------------
        // 1. Validate decision
        // -----------------------------
        if (!['ACCEPTED', 'DECLINED'].includes(decision)) {
            return req.reject(400, 'Decision must be ACCEPTED or DECLINED');
        }

        // -----------------------------
        // 2. Validate T&C Type
        // -----------------------------
        if (!['SALES', 'PURCHASING'].includes(tcType)) {
            return req.reject(400, 'Invalid T&C Type');
        }

        // -----------------------------
        // 3. HP User must never submit T&C
        // -----------------------------
        if (profile === 'HP') {
            return req.reject(403, 'HP User does not require Terms & Conditions');
        }

        // -----------------------------
        // 4. Validate profile vs T&C Type
        // -----------------------------
        if (profile === 'C' && tcType !== 'SALES') {
            return req.reject(403, 'Customer can only respond to SALES Terms & Conditions');
        }

        if (profile === 'S' && tcType !== 'PURCHASING') {
            return req.reject(403, 'Supplier can only respond to PURCHASING Terms & Conditions');
        }

        if (!['C', 'S', 'CS'].includes(profile)) {
            return req.reject(403, 'Unsupported user profile');
        }

        // -----------------------------
        // 5. Validate payload
        // -----------------------------
        if (!Array.isArray(subTypes) || subTypes.length === 0) {
            return req.reject(400, 'At least one T&C Sub Type is required');
        }

        /* TCActionLog only stores CUSTOMER or SUPPLIER.
        *  For CS users:
        * SALES      -> CUSTOMER
        * PURCHASING -> SUPPLIER    */
        const userProfile = tcType === 'SALES' ? 'CUSTOMER' : 'SUPPLIER';

        for (const { tcSubType, tcVersionId } of subTypes) {
            // -----------------------------
            // 6. Validate version is ACTIVE
            // -----------------------------
            const activeVersion = await SELECT.one
                .from(TCVersionMaster)
                .where({
                    ID: tcVersionId,
                    tcType,
                    tcSubType,
                    status: 'ACTIVE'
                });

            if (!activeVersion) {
                return req.reject(409, `T&C version is no longer active for ${tcSubType}`);
            }

            // -----------------------------
            // 7. Check existing action
            // -----------------------------
            const existing = await SELECT.one
                .from(TCActionLog)
                .where({
                    userEmailId: userEmail,
                    tcType,
                    tcSubType,
                    tcVersion_ID: tcVersionId
                });

            if (existing) {

                // Same user + same version -> UPDATE
                await UPDATE(TCActionLog, existing.ID).with({
                    firstName,
                    lastName,

                    status: decision,
                    acceptedOn: now,
                    lastLoginDate: now
                });

            } else {

                // First response to this version -> INSERT
                await INSERT.into(TCActionLog).entries({
                    userEmailId: userEmail,
                    firstName,
                    lastName,
                    userProfile,
                    tcType,
                    tcSubType,
                    tcVersion_ID: tcVersionId,
                    status: decision,
                    acceptedOn: now,
                    lastLoginDate: now
                });

            }
        }

        // Decline always ends the T&C flow.
        if (decision === 'DECLINED') {
            return { queueRemaining: false };
        }

        /* Dual profile user: SALES Shown first. After accepting SALES, PURCHASING still remains. */
        if (profile === 'CS' && tcType === 'SALES') {
            return { queueRemaining: true };
        }

        return { queueRemaining: false };
    });

    this.on('uploadTCVersion', async (req) => {

        const { tcType, tcSubType, fileName, fileContent } = req.data;

        const adminId = req.user.id;
        const adminEmail = req.user?.attr?.email || adminId;

        const now = new Date().toISOString();

        // -----------------------------
        // 1. Validate Type / Sub Type
        // -----------------------------
        const validCombinations = {
            SALES: ['CUSTOMER_PORTFOLIO_TERMS', 'MARKETPLACE_TERMS_OF_USE'],
            PURCHASING: ['POTAC', 'MARKETPLACE_TERMS_OF_USE']
        };

        if (!validCombinations[tcType] || !validCombinations[tcType].includes(tcSubType)) {
            return req.reject(400, 'Invalid T&C Type / Sub Type combination');
        }

        // -----------------------------
        // 2. Validate file
        // -----------------------------
        if (!fileName || !fileName.toLowerCase().endsWith('.pdf')) {
            return req.reject(400, 'Only PDF files are allowed');
        }

        // -----------------------------
        // 3. Determine next version
        // -----------------------------
        const existingVersions = await SELECT
            .from(TCVersionMaster)
            .columns('versionNumber')
            .where({ tcType, tcSubType });

        const highestVersion = existingVersions.reduce(
            (highest, row) => {
                const number = parseInt(String(row.versionNumber).replace(/^v/i, ''), 10) || 0;
                return Math.max(highest, number);
            }, 0);

        const nextVersion = `v${highestVersion + 1}`;

        // -----------------------------
        // 4. Find current ACTIVE version
        // -----------------------------
        const currentActive = await SELECT.one
            .from(TCVersionMaster)
            .where({
                tcType,
                tcSubType,
                status: 'ACTIVE'
            });

        // -----------------------------
        // 5. Archive current version
        // -----------------------------
        if (currentActive) {

            await UPDATE(TCVersionMaster).set({ status: 'ARCHIVED' })
                .where({ ID: currentActive.ID });

            await INSERT.into(ChangeLog).entries({

                adminUserId: adminId,
                adminEmail,
                actionType: 'ARCHIVE_TC',
                tcType,
                tcSubType,
                versionNumber: currentActive.versionNumber,
                actionTimestamp: now,
                details:
                    `${currentActive.versionNumber} automatically archived`
            });
        }

        // -----------------------------
        // 6. Temporary document path
        // -----------------------------
        //const documentPath = `pending-object-store/${tcType}/${tcSubType}/${nextVersion}/${fileName}`;
        // -------------------------------------
        // LOCAL DEV FILE STORE
        // Replace with BTP Object Store later
        // -------------------------------------

        const safeFileName = path.basename(fileName);

        const relativeFolder =
            path.join(
                "documents",
                tcType,
                tcSubType,
                nextVersion
            );

        const absoluteFolder =
            path.join(
                process.cwd(),
                "app",
                "tcpopup",
                "webapp",
                relativeFolder
            );

        await fs.mkdir(
            absoluteFolder,
            { recursive: true }
        );

        const absoluteFilePath =
            path.join(
                absoluteFolder,
                safeFileName
            );

        await fs.writeFile(
            absoluteFilePath,
            Buffer.from(
                fileContent,
                "base64"
            )
        );

        const documentPath =
            "/" +
            path.posix.join(
                "tcpopup",
                "webapp",
                "documents",
                tcType,
                tcSubType,
                nextVersion,
                safeFileName
            );

        // Generate ID ourselves so we can return it
        const tcVersionId = cds.utils.uuid();

        // -----------------------------
        // 7. Insert new ACTIVE version
        // -----------------------------
        await INSERT.into(TCVersionMaster).entries({

            ID: tcVersionId,
            tcType,
            tcSubType,
            versionNumber: nextVersion,
            effectiveDate: now,
            documentPath,
            fileName,
            status: 'ACTIVE',
            uploadedBy: adminId,
            uploadedAt: now
        });

        // -----------------------------
        // 8. Upload audit log
        // -----------------------------
        await INSERT.into(ChangeLog).entries({

            adminUserId: adminId,
            adminEmail,
            actionType: 'UPLOAD_TC',
            tcType,
            tcSubType,
            versionNumber: nextVersion,
            actionTimestamp: now,
            details: `${fileName} uploaded`
        });

        return { tcVersionId, versionNumber: nextVersion };
    });

    this.on("getLoginSession", async (req) => {

        let sessionId = null;

        /*
         * Production: IAS / XSUAA authentication provides the JWT
         * through req.user.authInfo.
         */
        const jwt = req.user?.authInfo?.token?.jwt;

        if (jwt) {

            try {

                const parts = jwt.split(".");

                if (parts.length === 3) {

                    const payload =
                        JSON.parse(
                            Buffer
                                .from(
                                    parts[1],
                                    "base64url"
                                )
                                .toString("utf8")
                        );

                    sessionId = payload.sid;

                }

            } catch (error) {

                console.error(
                    "Unable to read login session from JWT",
                    error
                );

            }

        }


        /** LOCAL DEVELOPMENT FALLBACK
         * Mocked Basic Auth has no IAS sid.
         * This simulates one login session for the
         * lifetime of the current cds watch process.*/
        if (!sessionId) {
            sessionId =
                `${LOCAL_BOOT_SESSION_ID}:${req.user.id}`;
        }
        const sessionKey =
            crypto
                .createHash("sha256")
                .update(
                    `${req.user.id}:${sessionId}`
                )
                .digest("hex");
        return {
            sessionKey
        };

    });
});