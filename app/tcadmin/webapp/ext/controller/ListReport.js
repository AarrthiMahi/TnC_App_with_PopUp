sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/Select",
    "sap/ui/core/Item",
    "sap/ui/unified/FileUploader",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (
    Dialog,
    Label,
    Select,
    Item,
    FileUploader,
    Button,
    VBox,
    MessageToast,
    MessageBox
) {
    "use strict";

    return {

        onCreateNewTCVersion: function () {

            let sFileContent = "";
            let sFileName = "";

            const oType = new Select({
                width: "100%",
                items: [
                    new Item({
                        key: "SALES",
                        text: "Sales"
                    }),
                    new Item({
                        key: "PURCHASING",
                        text: "Purchasing"
                    })
                ]
            });

            const oSubType = new Select({
                width: "100%"
            });

            function loadSubTypes(sType) {

                oSubType.removeAllItems();

                if (sType === "SALES") {

                    oSubType.addItem(new Item({
                        key: "CUSTOMER_PORTFOLIO_TERMS",
                        text: "Customer Portfolio Terms"
                    }));

                    oSubType.addItem(new Item({
                        key: "MARKETPLACE_TERMS_OF_USE",
                        text: "Marketplace Terms of Use"
                    }));

                } else {

                    oSubType.addItem(new Item({
                        key: "POTAC",
                        text: "POTAC"
                    }));

                    oSubType.addItem(new Item({
                        key: "MARKETPLACE_TERMS_OF_USE",
                        text: "Marketplace Terms of Use"
                    }));
                }
            }

            loadSubTypes("SALES");

            oType.attachChange(function () {
                loadSubTypes(oType.getSelectedKey());
            });


            const oUploader = new FileUploader({

                width: "100%",

                fileType: ["pdf"],

                placeholder: "Choose PDF file",

                change: function (oEvent) {

                    const aFiles =
                        oEvent.getParameter("files");

                    if (!aFiles || !aFiles.length) {
                        return;
                    }

                    const oFile = aFiles[0];

                    if (!oFile.name.toLowerCase().endsWith(".pdf")) {

                        MessageBox.error(
                            "Only PDF files are allowed"
                        );

                        return;
                    }

                    sFileName = oFile.name;

                    const oReader = new FileReader();

                    oReader.onload = function (e) {

                        sFileContent =
                            e.target.result.split(",")[1];
                    };

                    oReader.readAsDataURL(oFile);
                }
            });


            const oDialog = new Dialog({

                title: "Create New T&C Version",

                contentWidth: "35rem",

                content: [

                    new VBox({

                        width: "100%",

                        items: [

                            new Label({
                                text: "T&C Type",
                                required: true
                            }),

                            oType,

                            new Label({
                                text: "T&C Sub Type",
                                required: true
                            }).addStyleClass(
                                "sapUiSmallMarginTop"
                            ),

                            oSubType,

                            new Label({
                                text: "PDF Document",
                                required: true
                            }).addStyleClass(
                                "sapUiSmallMarginTop"
                            ),

                            oUploader
                        ]

                    }).addStyleClass(
                        "sapUiSmallMargin"
                    )
                ],


                beginButton: new Button({

                    text: "Publish",
                    type: "Emphasized",

                    press: async function () {

                        if (!sFileName || !sFileContent) {

                            MessageBox.error(
                                "Please select a PDF file"
                            );

                            return;
                        }

                        try {

                            const oResponse = await fetch(
                                "/tc/uploadTCVersion",
                                {
                                    method: "POST",

                                    credentials: "include",

                                    headers: {
                                        "Content-Type":
                                            "application/json"
                                    },

                                    body: JSON.stringify({

                                        tcType:
                                            oType.getSelectedKey(),

                                        tcSubType:
                                            oSubType.getSelectedKey(),

                                        fileName:
                                            sFileName,

                                        fileContent:
                                            sFileContent
                                    })
                                }
                            );


                            if (!oResponse.ok) {

                                const sError =
                                    await oResponse.text();

                                throw new Error(sError);
                            }


                            const oResult =
                                await oResponse.json();


                            MessageToast.show(
                                "Published " +
                                oResult.versionNumber
                            );


                            oDialog.close();


                            // Fast/simple refresh
                            setTimeout(function () {
                                window.location.reload();
                            }, 700);


                        } catch (oError) {

                            console.error(oError);

                            MessageBox.error(
                                "Upload failed. Check console / CAP terminal."
                            );
                        }
                    }
                }),


                endButton: new Button({

                    text: "Cancel",

                    press: function () {
                        oDialog.close();
                    }
                }),


                afterClose: function () {
                    oDialog.destroy();
                }

            });


            oDialog.open();
        }
    };
});