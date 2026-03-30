sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/ws/WebSocket",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageBox, MessageToast, WebSocket, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("zmwbi.controller.Create", {

     onInit: function () {
    this.oRouter = this.getOwnerComponent().getRouter();
    this.oRouter.getRoute("Create").attachPatternMatched(this._onObjectMatched, this);

    this._setInitialModels();
    this._initScreen();
},

        _setInitialModels: function () {
            this.getView().setModel(new JSONModel({
                isSaveEnabled: true
            }), "saveButtonModel");

            this.getView().setModel(new JSONModel({
                allPurchaseOrders: []
            }), "poModel");

            this.getView().setModel(new JSONModel({
                results: []
            }), "vendorModel");
        },

        _onObjectMatched: function () {
            this._initScreen();
            this._loadPurchaseOrders();
        },

        _initScreen: function () {
            var oLiveModel = new JSONModel({
                Weight: "0.000"
            });
            this.getView().setModel(oLiveModel, "liveModel");

            if (!this.websocket) {
                this.websocket = new WebSocket("/sap/bc/apc/sap/zapc_wb");

                this.websocket.attachOpen(function () {
                    console.log("websocket connected..!");
                });

                this.websocket.attachMessage(function (oEvent) {
                    try {
                        var oData = JSON.parse(oEvent.getParameter("data"));
                        this.getView().getModel("liveModel").setProperty("/Weight", oData.Weight);
                        MessageToast.show("Weight Sent by " + oData.Sender);
                    } catch (e) {
                        console.error("WebSocket parse error", e);
                    }
                }.bind(this));

                this.websocket.attachClose(function () {
                    MessageToast.show("Websocket connection is closed");
                }.bind(this));
            }

            var oItemModel = this.getOwnerComponent().getModel("ItemModel");
            if (oItemModel && oItemModel.getData() && oItemModel.getData().results && oItemModel.getData().results.length > 0) {
                this.getView().setModel(oItemModel, "ItemModel");
            } else {
                var aRows = [];
                for (var i = 1; i <= 3; i++) {
                    aRows.push(this._createEmptyRow(i));
                }

                oItemModel = new JSONModel({
                    results: aRows
                });

                this.getOwnerComponent().setModel(oItemModel, "ItemModel");
                this.getView().setModel(oItemModel, "ItemModel");
            }

            var oHeaderData = {
                Plant: "",
                TripId: "",
                Truckno: "",
                Supcode: "",
                Firstwgt: "",
                Secondwgt: "",
                Netwgt: "",
                Refunit: "",
                Status: "O",
                to_wgtitem: []
            };

            this.getView().setModel(new JSONModel(oHeaderData), "TRIPMODEL");
        },

        _createEmptyRow: function (iSno) {
            return {
                Sino: iSno,
                Invoiceno: "",
                Invoicedt: "",
                Pono: "",
                Poitem: "",
                Matnr: "",
                Qty: "",
                poNoItems: [],
                poItemItems: [],
                materialItems: []
            };
        },

       _loadPurchaseOrders: function () {
    var oMainModel = this.getOwnerComponent().getModel();

    if (!oMainModel) {
        MessageToast.show("Main OData model not available");
        return;
    }

    oMainModel.read("/PurchaseOrders", {
        success: function (oData) {
            var aResults = oData.results || [];
            this.getView().getModel("poModel").setProperty("/allPurchaseOrders", aResults);
            this._refreshAllRowDropdowns();
        }.bind(this),
        error: function (oError) {
            console.error("Error loading PurchaseOrders", oError);
            MessageToast.show("Failed to load Purchase Orders");
        }
    });
},
        _loadVendorsByPlant: function (sPlant) {
    var oMainModel = this.getOwnerComponent().getModel();

    if (!oMainModel) {
        MessageToast.show("Main OData model not available");
        return;
    }

    if (!sPlant) {
        this.getView().getModel("vendorModel").setProperty("/results", []);
        return;
    }

    oMainModel.read("/vendorF4", {
        filters: [
            new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sPlant)
        ],
        success: function (oData) {
            var aResults = oData.results || [];
            var oUnique = {};
            var aVendors = [];

            aResults.forEach(function (oItem) {
                if (oItem.Vendor && !oUnique[oItem.Vendor]) {
                    oUnique[oItem.Vendor] = true;
                    aVendors.push({
                        Vendor: String(oItem.Vendor),
                        Plant: String(oItem.Plant || "")
                    });
                }
            });

            this.getView().getModel("vendorModel").setProperty("/results", aVendors);
        }.bind(this),
        error: function (oError) {
            console.error("Error loading vendorF4", oError);
            this.getView().getModel("vendorModel").setProperty("/results", []);
            MessageToast.show("Failed to load Supplier Code");
        }.bind(this)
    });
},

        _refreshAllRowDropdowns: function () {
            var oItemModel = this.getView().getModel("ItemModel");
            var aRows = oItemModel.getProperty("/results") || [];

            for (var i = 0; i < aRows.length; i++) {
                this._setPoNoItemsForRow(aRows[i]);
                this._setPoItemItemsForRow(aRows[i]);
                this._setMaterialItemsForRow(aRows[i]);
            }

            oItemModel.setProperty("/results", aRows);
        },

        _getAllPurchaseOrders: function () {
            return this.getView().getModel("poModel").getProperty("/allPurchaseOrders") || [];
        },

        _getSelectedPlant: function () {
            return this.getView().getModel("TRIPMODEL").getProperty("/Plant");
        },

        _setPoNoItemsForRow: function (oRow) {
            var aAll = this._getAllPurchaseOrders();
            var sPlant = this._getSelectedPlant();
            var sFirst = oTripModel.getProperty("/Firstwgt");
            // var sSecond = oTripModel.getProperty("/Secondwgt");

            var oUnique = {};
            var aPoNos = [];

            aAll.forEach(function (oItem) {
                if (sPlant && String(oItem.Plant) !== String(sPlant)) {
                    return;
                }

                if (oItem.purchaseorderno && !oUnique[oItem.purchaseorderno]) {
                    oUnique[oItem.purchaseorderno] = true;
                    aPoNos.push({
                        purchaseorderno: String(oItem.purchaseorderno)
                    });
                }
            });

            oRow.poNoItems = aPoNos;
        },

        _setPoItemItemsForRow: function (oRow) {
            var aAll = this._getAllPurchaseOrders();
            var sPlant = this._getSelectedPlant();
            var sPoNo = oRow.Pono;

            if (!sPoNo) {
                oRow.poItemItems = [];
                return;
            }

            var oUnique = {};
            var aPoItems = [];
            } 
            // else if (!sSecond) {

            //     oTripModel.setProperty("/Secondwgt", sWeight);

            // var fFirst = parseFloat(sFirst) || 0;
            // var fSecond = parseFloat(sSecond) || 0;
            // var iNet = Math.abs(fFirst - fSecond);
                // calculate net weight
                //var iNet = parseFloat(sSecond) - parseFloat(sFirst);

            aAll.forEach(function (oItem) {
                if (sPlant && String(oItem.Plant) !== String(sPlant)) {
                    return;
                }

                if (String(oItem.purchaseorderno) !== String(sPoNo)) {
                    return;
                }

                if (oItem.purchaseorderitem && !oUnique[oItem.purchaseorderitem]) {
                    oUnique[oItem.purchaseorderitem] = true;
                    aPoItems.push({
                        purchaseorderitem: String(oItem.purchaseorderitem)
                    });
                }
            });

            oRow.poItemItems = aPoItems;
        },

        _setMaterialItemsForRow: function (oRow) {
            var aAll = this._getAllPurchaseOrders();
            var sPlant = this._getSelectedPlant();
            var sPoNo = oRow.Pono;
            var sPoItem = oRow.Poitem;

            if (!sPoNo || !sPoItem) {
                oRow.materialItems = [];
                return;
            }
                // oTripModel.setProperty("/Netwgt", iNet.toString());
            // }
            // else {
            //     sap.m.MessageToast.show("Both weights already captured");
            // }

            var oUnique = {};
            var aMaterials = [];

            aAll.forEach(function (oItem) {
                if (sPlant && String(oItem.Plant) !== String(sPlant)) {
                    return;
                }

                if (String(oItem.purchaseorderno) !== String(sPoNo)) {
                    return;
                }

                if (String(oItem.purchaseorderitem) !== String(sPoItem)) {
                    return;
                }

                if (oItem.Material && !oUnique[oItem.Material]) {
                    oUnique[oItem.Material] = true;
                    aMaterials.push({
                        Material: String(oItem.Material)
                    });
                }
            });

            oRow.materialItems = aMaterials;
        },

        onPlantChange: function (oEvent) {
            var sPlant = oEvent.getSource().getSelectedKey();

            this.getView().getModel("TRIPMODEL").setProperty("/Plant", sPlant);
            this.getView().getModel("TRIPMODEL").setProperty("/Supcode", "");

            this._loadVendorsByPlant(sPlant);

            var oItemModel = this.getView().getModel("ItemModel");
            var aRows = oItemModel.getProperty("/results") || [];

            aRows.forEach(function (oRow) {
                oRow.Pono = "";
                oRow.Poitem = "";
                oRow.Matnr = "";
                oRow.poItemItems = [];
                oRow.materialItems = [];
            });

            oItemModel.setProperty("/results", aRows);
            this._refreshAllRowDropdowns();
        },

        onPurchaseOrderChange: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("ItemModel");
            var sPath = oContext.getPath();
            var oItemModel = this.getView().getModel("ItemModel");
            var oRow = oItemModel.getProperty(sPath);

            oRow.Pono = oEvent.getSource().getSelectedKey();
            oRow.Poitem = "";
            oRow.Matnr = "";
            oRow.poItemItems = [];
            oRow.materialItems = [];

            this._setPoItemItemsForRow(oRow);
            this._setMaterialItemsForRow(oRow);

            oItemModel.setProperty(sPath, oRow);
            this.onFieldChange();
        },

        onPurchaseOrderItemChange: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("ItemModel");
            var sPath = oContext.getPath();
            var oItemModel = this.getView().getModel("ItemModel");
            var oRow = oItemModel.getProperty(sPath);

            oRow.Poitem = oEvent.getSource().getSelectedKey();
            oRow.Matnr = "";
            oRow.materialItems = [];

            this._setMaterialItemsForRow(oRow);

            oItemModel.setProperty(sPath, oRow);
            this.onFieldChange();
        },

        onMaterialChange: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("ItemModel");
            var sPath = oContext.getPath();
            var oItemModel = this.getView().getModel("ItemModel");
            var oRow = oItemModel.getProperty(sPath);

            oRow.Matnr = oEvent.getSource().getSelectedKey();
            oItemModel.setProperty(sPath, oRow);
            this.onFieldChange();
        },

        onInvoiceNoLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();

            var sCleanValue = sValue.replace(/[^A-Za-z0-9\/-]/g, "");

            if (sValue !== sCleanValue) {
                oInput.setValue(sCleanValue);
                oInput.setValueState("Error");
                oInput.setValueStateText("Only letters, numbers, hyphen (-) and slash (/) are allowed.");
            } else {
                oInput.setValueState("None");
                oInput.setValueStateText("");
            }

            this.onFieldChange();
        },

        onCaptureWeight: function () {
            var oLiveModel = this.getView().getModel("liveModel");
            var oTripModel = this.getView().getModel("TRIPMODEL");

            var sWeight = oLiveModel.getProperty("/Weight");
            var sFirst = oTripModel.getProperty("/Firstwgt");
            var sSecond = oTripModel.getProperty("/Secondwgt");

            if (!sFirst) {
                oTripModel.setProperty("/Firstwgt", sWeight);
            } else if (!sSecond) {
                oTripModel.setProperty("/Secondwgt", sWeight);

                var fFirst = parseFloat(sFirst) || 0;
                var fSecond = parseFloat(sWeight) || 0;
                var iNet = Math.abs(fFirst - fSecond);

                oTripModel.setProperty("/Netwgt", iNet.toString());
            } else {
                MessageToast.show("Both weights already captured");
            }
        },

        onFieldChange: function () {
            var oModel = this.getView().getModel("ItemModel");
            var aData = oModel.getProperty("/results");

            if (!aData || aData.length === 0) {
                return;
            }

            var oLastRow = aData[aData.length - 1];

            if (
                oLastRow.Invoiceno ||
                oLastRow.Pono ||
                oLastRow.Poitem ||
                oLastRow.Matnr ||
                oLastRow.Qty
            ) {
                var oNewRow = this._createEmptyRow(aData.length + 1);
                this._setPoNoItemsForRow(oNewRow);
                aData.push(oNewRow);
                oModel.setProperty("/results", aData);
            }
        },

        onDeleteRow: function (oEvent) {
            var oModel = this.getView().getModel("ItemModel");
            var aData = oModel.getProperty("/results");

            var oItem = oEvent.getSource().getParent();
            var iIndex = parseInt(oItem.getBindingContext("ItemModel").getPath().split("/")[2], 10);

            aData.splice(iIndex, 1);

            for (var i = 0; i < aData.length; i++) {
                aData[i].Sino = i + 1;
            }

            if (aData.length === 0) {
                var oNewRow = this._createEmptyRow(1);
                this._setPoNoItemsForRow(oNewRow);
                aData.push(oNewRow);
            }

            oModel.setProperty("/results", aData);
        },

        onSave: function () {
            var oHeader = this.getView().getModel("TRIPMODEL").getData();
            var aItems = this.getView().getModel("ItemModel").getData().results;

            var aValidItems = aItems.filter(function (item) {
                return item.Invoiceno && item.Pono && item.Poitem && item.Matnr;
            });

            var sPlant = oHeader.Plant;
            var sTripId = oHeader.TripId;

            aValidItems.forEach(function (item, index) {
                item.Plant = sPlant;
                item.TripId = sTripId;
                item.Sino = (index + 1).toString();

                delete item.poNoItems;
                delete item.poItemItems;
                delete item.materialItems;
            });

            oHeader.to_wgtitem = aValidItems;

            var oModel = this.getView().getModel();

            oModel.create("/ZC_MGATEWT_HDR", oHeader, {
                success: function (oSuccess) {
                    this.getView().getModel("TRIPMODEL").setProperty("/TripId", oSuccess.TripId);
                    MessageBox.show("Trip ID Created Successfully - " + oSuccess.TripId);
                }.bind(this),
                error: function (oError) {
                    console.error(oError);
                    MessageToast.show("Error while saving");
                }
            });
        },

        onVendorF4: function () {
        }
    });
});