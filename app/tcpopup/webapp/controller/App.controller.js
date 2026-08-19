sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer",
    "sap/m/Title",
    "sap/m/Text",
    "sap/ui/core/HTML",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (
    Controller,
    Dialog,
    Button,
    VBox,
    HBox,
    Toolbar,
    ToolbarSpacer,
    Title,
    Text,
    HTML,
    MessageBox,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "hpbuysell.adm.tncmgmt.popup.controller.App",
        {

            onInit: function () {

                this._queue = [];
                this._queueIndex = 0;

                this._sessionKey = null;
                this._sessionStorageKey = null;

                this._initializeTCSession();
            },

            _initializeTCSession: async function () {

                try {

                    const oResponse = await fetch("/tc/getLoginSession()", { credentials: "include" });

                    if (!oResponse.ok) {
                        throw new Error("Unable to determine login session");
                    }

                    const oData = await oResponse.json();

                    this._sessionKey = oData.sessionKey;

                    this._sessionStorageKey = "hpbuysell.tncmgmt.completed." + this._sessionKey;


                    /*
                     * Same Work Zone login session already
                     * completed T&C -> do not show again.
                     */
                    if (localStorage.getItem(this._sessionStorageKey) === "true") {
                        console.log("T&C already completed for this login session.");
                        return;
                    }

                    /* First time during this login session.*/
                    this._loadTerms();
                } catch (oError) { console.error("T&C session initialization failed:", oError); }
            },

            _markTCSessionCompleted: function () {

                if (!this._sessionStorageKey) { return; }

                localStorage.setItem(this._sessionStorageKey, "true");

                console.log("T&C completed for current login session.");
            },

            _loadTerms: async function () {

                try {
                    const oResponse = await fetch("/tc/getApplicableTC()", { credentials: "include" });

                    if (!oResponse.ok) { throw new Error("getApplicableTC failed"); }

                    const oData = await oResponse.json();
                    this._queue = oData.value || [];
                    console.log("Applicable T&C:", this._queue);

                    if (!this._queue.length) {
                        console.log("No applicable T&C found.");

                        this._markTCSessionCompleted();
                        return;
                    }

                    this._queueIndex = 0;
                    this._showCurrentTC();

                } catch (oError) {
                    console.error("T&C load error:", oError);

                    MessageBox.error("Unable to load Terms & Conditions.");
                }
            },

            _renderPdf: async function (oSubType, sContainerId) {

                try {

                    const pdfjsLib = await import("/tcpopup/webapp/vendor/pdfjs/pdf.mjs");

                    pdfjsLib.GlobalWorkerOptions.workerSrc = "/tcpopup/webapp/vendor/pdfjs/pdf.worker.mjs";

                    const oLoadingTask = pdfjsLib.getDocument({ url: oSubType.documentPath, withCredentials: true });
                    const oPdf = await oLoadingTask.promise;
                    const oContainer = document.getElementById(sContainerId);
                    if (!oContainer) { return; }

                    oContainer.innerHTML = "";

                    /* Render every PDF page vertically.
                     * There are NO browser PDF controls.*/
                    for (let iPage = 1; iPage <= oPdf.numPages; iPage++) {
                        const oPage = await oPdf.getPage(iPage);
                        const oBaseViewport = oPage.getViewport({ scale: 1 });

                        /*Fit document to panel width.*/
                        const iAvailableWidth = Math.max(oContainer.clientWidth - 4, 300);
                        const fScale = iAvailableWidth / oBaseViewport.width;

                        const oViewport = oPage.getViewport({ scale: fScale });
                        const oCanvas = document.createElement( "canvas" );
                        const oContext = oCanvas.getContext( "2d" );
                        const fOutputScale =  window.devicePixelRatio || 1;

                        oCanvas.width =  Math.floor( oViewport.width * fOutputScale );
                        oCanvas.height = Math.floor( oViewport.height * fOutputScale );
                        oCanvas.style.width = Math.floor( oViewport.width ) + "px";
                        oCanvas.style.height = Math.floor( oViewport.height ) + "px";

                        /* Makes pages visually continuous.*/
                        oCanvas.style.display = "block";
                        oCanvas.style.margin = "0 auto";
                        oCanvas.style.padding = "0";
                        oCanvas.style.border = "none";
                        oCanvas.style.background = "#ffffff";
                        oContainer.appendChild( oCanvas );

                        const aTransform = fOutputScale !== 1 ? [ fOutputScale, 0, 0, fOutputScale, 0, 0 ] : null;

                        await oPage.render({ 
                            canvasContext: oContext,
                            transform: aTransform,
                            viewport: oViewport
                        }).promise;
                    }
                } catch (oError) { console.error( "PDF rendering failed:",  oError ); }
            },

            _showCurrentTC: function () {

                const oCurrent = this._queue[this._queueIndex];

                if (!oCurrent) { return; }

                const aDocumentContainers = oCurrent.subTypes.map(
                        (oSubType) => {
                            const sTitle = oSubType.tcSubType.replace(/_/g, " ");
                            const sDocumentUrl = oSubType.documentPath;

                            return new VBox({
                                width: "calc(50% - 1.2rem)",
                                height: "100%",

                                items: [
                                    new Toolbar({
                                        content: [
                                            new Title({ text: sTitle, level: "H4" }),
                                            new ToolbarSpacer(),
                                            new Button({
                                                icon: "sap-icon://download",
                                                tooltip: "Download",
                                                type: "Transparent",

                                                press: () => { this._downloadDocument( oSubType ); }
                                            })
                                        ]
                                    }),

                                    new HTML({ content: 
                                            '<div ' + 
                                            'id="pdf_' + 
                                            oSubType.tcVersionId.replace(/-/g, "") +                                            '" ' +
                                            'style="' +
                                            'height:calc(100vh - 11rem);' +
                                            'width:100%;' +
                                            'overflow-y:scroll;' +
                                            'overflow-x:hidden;' +
                                            'box-sizing:border-box;' +
                                            'scrollbar-gutter:stable;' +
                                            'background:#ffffff;' +
                                            '">' +
                                            '</div>'
                                    })
                                ]
                            });
                        }
                    );

                this._dialog = new Dialog({
                    title: " Terms & Conditions",
                    stretch: true,
                    horizontalScrolling: false,
                    verticalScrolling: false,
                    // Prevent ESC from closing
                    escapeHandler: function () { },

                    afterOpen: async () => {
                        for (const oSubType of oCurrent.subTypes) {
                            await this._renderPdf( oSubType, "pdf_" + oSubType.tcVersionId.replace(/-/g, "") );
                        }
                    },

                    content: [
                        new VBox({
                            width: "100%",
                            height: "100%",
                            items: [
                                
                                new HBox({
                                    width: "100%",
                                    fitContainer: true,
                                    wrap: "NoWrap",

                                    justifyContent: "SpaceBetween",
                                    alignItems: "Stretch",
                                    items: aDocumentContainers
                                }).addStyleClass("sapUiSmallMarginEnd")
                            ]
                        })
                    ],

                    beginButton: new Button({
                        text: "Accept",
                        type: "Emphasized",
                        icon: "sap-icon://accept",
                        press: this._submitDecision.bind( this, "ACCEPTED" ) }),

                    endButton: new Button({
                        text: "Decline",
                        type: "Reject",
                        icon: "sap-icon://decline",
                        press: this._submitDecision.bind( this, "DECLINED" ) })
                });
                this._dialog.open();
            },


            _downloadDocument: async function (
                oSubType
            ) {

                try {

                    const oResponse =
                        await fetch(
                            oSubType.documentPath,
                            {
                                credentials:
                                    "include"
                            }
                        );

                    if (!oResponse.ok) {
                        throw new Error(
                            "Download failed"
                        );
                    }

                    const oBlob =
                        await oResponse.blob();

                    const sUrl =
                        URL.createObjectURL(
                            oBlob
                        );

                    const oLink =
                        document.createElement(
                            "a"
                        );

                    oLink.href = sUrl;

                    oLink.download =
                        oSubType.fileName ||
                        (
                            oSubType.tcSubType +
                            "_" +
                            oSubType.versionNumber +
                            ".pdf"
                        );

                    document.body.appendChild(
                        oLink
                    );

                    oLink.click();

                    document.body.removeChild(
                        oLink
                    );

                    URL.revokeObjectURL(
                        sUrl
                    );

                } catch (oError) {

                    console.error(
                        oError
                    );

                    MessageBox.error(
                        "Unable to download document."
                    );
                }
            },


            _submitDecision: async function (
                sDecision
            ) {

                const oCurrent =
                    this._queue[this._queueIndex];


                const oPayload = {

                    tcType:
                        oCurrent.tcType,

                    decision:
                        sDecision,

                    subTypes:
                        oCurrent.subTypes.map(
                            function (oItem) {

                                return {

                                    tcSubType:
                                        oItem.tcSubType,

                                    tcVersionId:
                                        oItem.tcVersionId

                                };

                            }
                        )

                };


                try {

                    const oResponse = await fetch(
                        "/tc/submitTCAction",
                        {
                            method: "POST",

                            credentials:
                                "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(oPayload)
                        }
                    );


                    if (!oResponse.ok) {

                        const sError =
                            await oResponse.text();

                        throw new Error(
                            sError
                        );
                    }


                    const oResult =
                        await oResponse.json();


                    if (this._dialog) {

                        this._dialog.close();
                        this._dialog.destroy();
                        this._dialog = null;

                    }


                    if (
                        sDecision ===
                        "DECLINED"
                    ) {

                        this._logoutFromWorkZone();

                        return;
                    }


                    if (
                        oResult.queueRemaining === true
                    ) {

                        /*
                         * CS user:
                         * SALES finished but PURCHASING remains.
                         *
                         * DO NOT mark the session complete yet.
                         */
                        this._queueIndex++;

                        this._showCurrentTC();

                        return;
                    }


                    /*
                     * All applicable T&C completed.
                     */
                    this._markTCSessionCompleted();


                    MessageToast.show(
                        "Terms & Conditions accepted."
                    );


                } catch (oError) {

                    console.error(
                        "submitTCAction error:",
                        oError
                    );

                    MessageBox.error(
                        "Unable to save your response."
                    );
                }
            },


            _logoutFromWorkZone: function () {

                if (
                    window.sap &&
                    sap.ushell &&
                    sap.ushell.Container &&
                    typeof sap.ushell.Container.logout ===
                    "function"
                ) {

                    sap.ushell.Container.logout();

                    return;
                }


                console.log(
                    "Local mode: logout simulated."
                );

                window.location.replace("/");
            }

        }
    );
});