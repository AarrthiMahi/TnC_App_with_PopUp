sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer",
    "sap/m/Title",
    "sap/ui/core/HTML",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (
    Controller,
    Dialog,
    Button,
    VBox,
    Toolbar,
    ToolbarSpacer,
    Title,
    HTML,
    MessageBox,
    MessageToast
) {
    "use strict";

    return Controller.extend("hpbuysell.adm.tncmgmt.popup.controller.App", {

        // =========================================================
        // INITIALIZATION
        // =========================================================

        onInit: function () {

            this._startPerf();
            this._markPerf("Controller initialized");

            this._queue = [];
            this._queueIndex = 0;

            this._sessionKey = null;
            this._sessionStorageKey = null;

            this._pdfJsPromise = null;

            this._initializeTCSession();
        },


        // =========================================================
        // I18N
        // =========================================================
        _getResourceBundle: async function () {

            const oModel =
                this.getOwnerComponent().getModel("i18n") ||
                this.getView().getModel("i18n");

            if (!oModel) {
                console.warn(
                    "i18n model not available. Falling back to keys."
                );
                return null;
            }

            const vBundle = oModel.getResourceBundle();
            if (vBundle && typeof vBundle.then === "function") {
                return await vBundle;
            }
            return vBundle;
        },

        _getSubTypeLabel: function (oBundle, sSubTypeId) {

            return this._getText(
                oBundle,
                "SUBTYPE_" + sSubTypeId,
                sSubTypeId
            );
        },

        _getText: function (oBundle, sKey, sFallback, aParameters) {

            if (!oBundle) { return sFallback || sKey; }

            try {
                return oBundle.getText(sKey, aParameters || []);
            } catch (oError) {
                console.warn(`Missing i18n key: ${sKey}`, oError);
                return sFallback || sKey;
            }
        },


        // =========================================================
        // LOGIN SESSION
        // =========================================================
        _initializeTCSession: async function () {

            try {
                const oResponse = await fetch("/tc/getLoginSession()", { credentials: "include" });
                if (!oResponse.ok) {
                    throw new Error("Unable to determine login session");
                }

                const oData = await oResponse.json();
                this._markPerf("Login session received");
                this._sessionKey = oData.sessionKey;
                this._sessionStorageKey = "hpbuysell.tncmgmt.completed." + this._sessionKey;

                // Already completed during this login session
                if (localStorage.getItem(this._sessionStorageKey) === "true") {
                    console.log("T&C already completed for this login session.");
                    return;
                }

                // First execution in current login session
                await this._loadTerms();
            } catch (oError) {
                console.error("T&C session initialization failed:", oError);
            }
        },

        _markTCSessionCompleted: function () {
            if (!this._sessionStorageKey) { return; }
            localStorage.setItem(this._sessionStorageKey, "true");
            console.log("T&C completed for current login session.");
        },

        // =========================================================
        // GET APPLICABLE T&C
        // =========================================================
        _loadTerms: async function () {
            try {
                const oResponse = await fetch("/tc/getApplicableTC()", { credentials: "include" });
                if (!oResponse.ok) {
                    throw new Error("getApplicableTC failed");
                }
                const oData = await oResponse.json();
                this._markPerf("Applicable T&C received");
                this._queue = oData.value || [];

                console.log("Applicable T&C:", this._queue);

                // HP User / no applicable T&C
                if (!this._queue.length) {
                    console.log("No applicable T&C found.");
                    this._markTCSessionCompleted();
                    return;
                }

                this._queueIndex = 0;
                this._markPerf("Starting popup rendering");
                await this._showCurrentTC();
            } catch (oError) {
                console.error("T&C load error:", oError);
                const oBundle = await this._getResourceBundle();
                MessageBox.error(
                    this._getText(oBundle, "TC_LOAD_ERROR", "Unable to load Terms & Conditions."));
            }
        },


        // =========================================================
        // PDF.JS
        // =========================================================
        _getPdfJs: function () {
            if (!this._pdfJsPromise) {
                this._pdfJsPromise = import("/tcpopup/webapp/vendor/pdfjs/pdf.mjs")
                    .then((pdfjsLib) => {
                        pdfjsLib
                            .GlobalWorkerOptions
                            .workerSrc =
                            "/tcpopup/webapp/vendor/pdfjs/pdf.worker.mjs";
                        return pdfjsLib;
                    });
            }
            return this._pdfJsPromise;
        },


        // =========================================================
        // RENDER SINGLE PDF PAGE
        // =========================================================
        _renderPdfPage: async function (
            oPdf,
            iPage,
            oContainer
        ) {
            const oPage = await oPdf.getPage(iPage);
            const oBaseViewport = oPage.getViewport({ scale: 1 });

            /* 0.96 gives slightly smaller content
             * while using almost the entire width.*/
            const iAvailableWidth = Math.max(oContainer.clientWidth - 2, 300);
            const fScale = (iAvailableWidth / oBaseViewport.width) * 0.88;
            const oViewport = oPage.getViewport({ scale: fScale });

            const oCanvas = document.createElement("canvas");
            const oContext = oCanvas.getContext("2d");

            /* Cap device scale to reduce CPU/memory
             * cost while remaining readable.*/
            const fOutputScale = Math.min(window.devicePixelRatio || 1, 1.5);
            oCanvas.width = Math.floor(oViewport.width * fOutputScale);
            oCanvas.height = Math.floor(oViewport.height * fOutputScale);
            oCanvas.style.width = Math.floor(oViewport.width) + "px";
            oCanvas.style.height = Math.floor(oViewport.height) + "px";

            /* Continuous document appearance */
            oCanvas.style.display = "block";
            oCanvas.style.margin = "0";
            oCanvas.style.padding = "0";
            oCanvas.style.border = "none";
            oCanvas.style.background = "#ffffff";
            oContainer.appendChild(oCanvas);
            const aTransform = fOutputScale !== 1 ? [fOutputScale, 0, 0, fOutputScale, 0, 0] : null;

            await oPage.render({
                canvasContext: oContext,
                transform: aTransform,
                viewport: oViewport
            }).promise;

            /* Free page resources after rendering. */
            if (typeof oPage.cleanup === "function") { oPage.cleanup(); }
        },

        // =========================================================
        // RENDER COMPLETE PDF
        // =========================================================
        _renderPdf: async function (oSubType, sContainerId) {
            try {
                const pdfjsLib = await this._getPdfJs();
                const oLoadingTask = pdfjsLib.getDocument({
                    url: oSubType.documentPath,
                    withCredentials: true
                });

                const oPdf = await oLoadingTask.promise;
                this._markPerf(`${oSubType.tcSubTypeId} PDF loaded`);
                const oContainer = document.getElementById(sContainerId);

                if (!oContainer) {
                    console.warn(`PDF container not found: ${sContainerId}`);
                    return;
                }

                oContainer.innerHTML = "";

                // -----------------------------
                // Render first page immediately
                // -----------------------------
                await this._renderPdfPage(oPdf, 1, oContainer);
                this._markPerf(`${oSubType.tcSubTypeId} first page visible`);

                // One-page PDF
                if (oPdf.numPages <= 1) {
                    this._markPerf(`${oSubType.tcSubTypeId} fully rendered`);
                    return;
                }

                // -----------------------------
                // Progressive remaining pages
                // -----------------------------
                const fnRenderRemaining = async () => {
                    try {
                        for (let iPage = 2; iPage <= oPdf.numPages; iPage++) {
                            /* Allow browser to paint and
                             * remain responsive between pages. */
                            await new Promise((resolve) => requestAnimationFrame(resolve));

                            /* Dialog may have been closed.*/
                            if (!document.getElementById(sContainerId)) { return; }
                            await this._renderPdfPage(oPdf, iPage, oContainer);
                        }

                        this._markPerf(`${oSubType.tcSubTypeId} fully rendered`);
                    } catch (oError) {
                        console.error("Remaining PDF page rendering failed:", oError);
                    }
                };

                /* Do not block initial popup usability. */
                setTimeout(fnRenderRemaining, 0);
            } catch (oError) {
                console.error("PDF rendering failed:", oError);
            }
        },

        // =========================================================
        // POPUP
        // =========================================================
        _showCurrentTC: async function () {
            const oCurrent = this._queue[this._queueIndex];
            if (!oCurrent) { return; }
            const oBundle = await this._getResourceBundle();

            /* Backend already determines business order:
             * SALES:
             * 1. CUSTOMER_PORTFOLIO_TERMS
             * 2. MARKETPLACE_TERMS_OF_USE
             * PURCHASING:
             * 1. POTAC
             * 2. MARKETPLACE_TERMS_OF_USE */
            const aDocumentContainers = oCurrent.subTypes.map((oSubType) => {
                /*IMPORTANT: Label comes from i18n.
                 * Do NOT derive UI label by replacing underscores.*/
                const sTitle = this._getSubTypeLabel( oBundle, oSubType.tcSubTypeId );
                const sContainerId = "pdf_" + oSubType.tcVersionId;
                return new VBox({
                    width: "100%",
                    items: [
                        // -------------------------
                        // Sub Type Header
                        // -------------------------
                        new Toolbar({
                            content: [
                                new Title({ text: sTitle, level: "H4" }).addStyleClass("tcSubTypeTitle"),
                                new ToolbarSpacer(),

                                // ---------------------
                                // Download
                                // ---------------------
                                new Button({
                                    icon: "sap-icon://download",
                                    tooltip: this._getText(oBundle, "DOWNLOAD", "Download"),
                                    type: "Transparent",
                                    press: () => { this._downloadDocument(oSubType); }
                                })
                            ]
                        }),

                        // -------------------------
                        // PDF Container
                        // -------------------------
                        new HTML({
                            content:
                                '<div ' +
                                'id="' + sContainerId + '" ' +
                                'class="tcPdfScroll" ' +
                                'style="' +
                                'height:calc(50vh - 7rem);' +
                                'width:100%;' +
                                'overflow-y:scroll;' +
                                'overflow-x:hidden;' +
                                'box-sizing:border-box;' +
                                'scrollbar-gutter:stable;' +
                                'scrollbar-width:auto;' +
                                'scrollbar-color:#777 #eee;' +
                                'padding:0;' +
                                'margin:0;' +
                                'background:#ffffff;' +
                                'border:1px solid #d9d9d9;' +
                                '">' +
                                '</div>'
                        })
                    ]
                }).addStyleClass("tcDocumentSection");
            }
            );

            // =====================================================
            // FULL SCREEN DIALOG
            // =====================================================
            this._dialog = new Dialog({
                stretch: true,
                /*Dialog itself never scrolls. Only PDF containers scroll.*/
                horizontalScrolling: false,
                verticalScrolling: false,

                // -----------------------------
                // CENTERED TITLE
                // -----------------------------
                customHeader: new Toolbar({
                    content: [
                        new Title({
                            text: "Terms & Conditions",
                            level: "H4",
                            width: "100%",
                            textAlign: "Center"
                        }).addStyleClass("tcMainTitle")
                    ]
                }),


                /* User cannot escape the mandatory T&C popup. */
                escapeHandler: function (oPromise) { oPromise.reject(); },

                // -----------------------------
                // DOCUMENTS
                // -----------------------------
                content: [
                    new VBox({
                        width: "100%",
                        items: aDocumentContainers
                    }).addStyleClass("tcDocumentsContainer")
                ],

                // -----------------------------
                // PDF RENDERING
                // -----------------------------
                afterOpen: () => {
                    this._markPerf("Popup visible");
                    /* Load both documents in parallel. */
                    Promise.all(oCurrent.subTypes.map((oSubType) => {
                        return this._renderPdf(oSubType, "pdf_" + oSubType.tcVersionId.replace(/-/g, ""));
                    })
                    ).catch((oError) => {
                        console.error("Parallel PDF rendering failed:", oError);
                    });
                },

                // -----------------------------
                // ACCEPT
                // -----------------------------
                beginButton:
                    new Button({
                        text: this._getText(oBundle, "ACCEPT", "Accept"),
                        type: "Emphasized",
                        icon: "sap-icon://accept",
                        press: this._submitDecision.bind(this, "ACCEPTED")
                    }),

                // -----------------------------
                // DECLINE
                // -----------------------------
                endButton: new Button({
                    text: "Decline",
                    type: "Reject",
                    icon: "sap-icon://decline",
                    press: this._submitDecision.bind(this, "DECLINED")
                })
            });
            this._dialog.open();
        },


        // =========================================================
        // DOWNLOAD
        // =========================================================
        _getDownloadFileName: function (oSubType) {
            /* First preference: filename stored by Admin upload. */
            if (oSubType.fileName) { return oSubType.fileName; }
            if (oSubType.documentPath) {
                const sPath = decodeURIComponent(oSubType.documentPath);
                const sPathFileName = sPath.split("/").pop();
                if (sPathFileName) { return sPathFileName; }
            }
            return "terms-and-conditions.pdf";
        },


        _downloadDocument: async function (oSubType) {
            try {
                const oResponse = await fetch(oSubType.documentPath, { credentials: "include" });
                if (!oResponse.ok) { throw new Error("Download failed"); }
                const oBlob = await oResponse.blob();
                const sUrl = URL.createObjectURL(oBlob);
                const oLink = document.createElement("a");
                oLink.href = sUrl;
                /* Dynamic actual uploaded filename. */
                oLink.download = oSubType.fileName || (oSubType.tcSubTypeId + "_" + oSubType.versionNumber + ".pdf");
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sUrl);
            } catch (oError) {
                console.error(oError);
                MessageBox.error("Unable to download document.");
            }
        },

        // =========================================================
        // ACCEPT / DECLINE
        // =========================================================
        _submitDecision: async function (sDecision) {

            const oCurrent = this._queue[this._queueIndex];
            const oPayload = {
                tcType: oCurrent.tcType,
                decision: sDecision,
                subTypes: oCurrent.subTypes.map(function (oItem) {
                    return {
                        tcSubTypeId: oItem.tcSubTypeId,
                        tcVersionId: oItem.tcVersionId
                    };
                }
                )
            };

            try {
                const oResponse = await fetch(
                    "/tc/submitTCAction",
                    {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(oPayload)
                    }
                );

                if (!oResponse.ok) {
                    const sError = await oResponse.text();
                    throw new Error(sError);
                }
                const oResult = await oResponse.json();

                // -----------------------------
                // Close current dialog
                // -----------------------------
                if (this._dialog) {
                    this._dialog.close();
                    this._dialog.destroy();
                    this._dialog = null;
                }

                // -----------------------------
                // DECLINE
                // -----------------------------

                if (sDecision === "DECLINED") {
                    /* Do NOT mark session completed.
                     * User must be logged out. */
                    this._logoutFromWorkZone();
                    return;
                }

                // -----------------------------
                // CS PROFILE
                // -----------------------------
                if (oResult.queueRemaining === true) {

                    /* SALES accepted. PURCHASING remains.
                     * Do NOT mark login session complete yet. */
                    this._queueIndex++;
                    await this._showCurrentTC();
                    return;
                }

                // -----------------------------
                // ALL T&C COMPLETED
                // -----------------------------
                this._markTCSessionCompleted();
                const oBundle = await this._getResourceBundle();
                MessageToast.show(this._getText(oBundle, "TC_ACCEPTED", "Terms & Conditions accepted."));
            } catch (oError) {
                console.error("submitTCAction error:", oError);
                const oBundle = await this._getResourceBundle();
                MessageBox.error(this._getText(oBundle, "TC_SAVE_ERROR", "Unable to save your response."));
            }
        },

        // =========================================================
        // WORK ZONE LOGOUT
        // =========================================================
        _logoutFromWorkZone: function () {
            /* Actual Work Zone shell */
            if (window.sap && sap.ushell && sap.ushell.Container && typeof sap.ushell.Container.logout === "function") {
                sap.ushell.Container.logout();
                return;
            }

            /* Local development only.*/
            console.log("Local mode: logout simulated.");
            window.location.replace("/");
        },

        // =========================================================
        // PERFORMANCE
        // =========================================================
        _startPerf: function () {
            this._perfStart = performance.now();
        },

        _markPerf: function (sLabel) {
            if (this._perfStart === undefined) { return; }
            const iMs = performance.now() - this._perfStart;

            console.log(`[T&C PERF] ${sLabel}: ${iMs.toFixed(0)} ms`);
        }
    });
});