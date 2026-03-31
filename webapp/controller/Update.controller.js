sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/core/ws/WebSocket"

], function (controller, MessageBox, WebSocket) {
    "use strict";

    return controller.extend("zmwbi.controller.Update", {


        onInit: function () {
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("Update").attachPatternMatched(this._onObjectMatched, this);

            this._initScreen();

        },
        _onObjectMatched: function () {
            debugger;
            //this._clearModels();    
            this._initScreen();
            var oItemModel = this.getOwnerComponent().getModel("ItemModel");
            var oTripModel = this.getOwnerComponent().getModel("TRIPMODEL");
            var sPlant = oTripModel.getProperty("/Plant");
            var oVendorCombo = this.byId("idVendor");
            var oBinding = oVendorCombo.getBinding("items");
            if (oBinding) {
                var aFilters = [
                    new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sPlant)
                ];
                oBinding.filter(aFilters);
            }
            this.getView().setModel(oTripModel, "TRIPMODEL");

            this._loadPurchaseOrders();
            if (oItemModel) {
                this.byId("idItemTable").setModel(oItemModel, "ItemModel");
            }
        },
        _initScreen: function () {
            // Live model
            var oLiveModel = new sap.ui.model.json.JSONModel({
                Weight: "0.000"
            });
            this.getView().setModel(oLiveModel, "liveModel");

            // WebSocket (avoid multiple connections ⚠️)
            if (!this.websocket) {
                this.websocket = new WebSocket("/sap/bc/apc/sap/zapc_wb");

                this.websocket.attachOpen(function () {
                    console.log("websocket connected..!");
                });

                this.websocket.attachMessage(function (oEvent) {
                    const message = JSON.parse(oEvent.getParameter("data"));
                    var oModel = this.getView().getModel("liveModel");
                    oModel.setProperty("/Weight", message.Weight);

                    sap.m.MessageToast.show("Weight Sent by " + message.Sender);
                }.bind(this));

                this.websocket.attachClose(function () {
                    sap.m.MessageToast.show("Websocket connection is closed");
                }.bind(this));
            }

            var oItemModel = this.getOwnerComponent().getModel("ItemModel");
            debugger;
            if (oItemModel && oItemModel.getData() && oItemModel.getData().results && oItemModel.getData().results.length > 0) {
                this.getOwnerComponent().setModel(oItemModel, "ItemModel");
            } else {
                // Table rows
                var aRows = [];
                for (var i = 1; i <= 3; i++) {
                    aRows.push(this._createEmptyRow(i));
                }

                var oEmptyModel = new sap.ui.model.json.JSONModel({
                    results: aRows
                });
                this.getOwnerComponent().setModel(oEmptyModel, "ItemModel");
            }


            // Header model
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

            var oHeaderModel = new sap.ui.model.json.JSONModel(oHeaderData);
            this.getView().setModel(oHeaderModel, "TRIPMODEL");
        },
        _clearModels: function () {
            var oItemModel = this.getView().getModel("ItemModel");
            if (oItemModel) {
                oItemModel.setData({ results: [] });
            }

            var oTripModel = this.getView().getModel("TRIPMODEL");
            if (oTripModel) {
                oTripModel.setData({});
            }
        },
        onVendorChange: function (oEvent) {
            var sVendor = oEvent.getSource().getSelectedKey();

            var oTripModel = this.getView().getModel("TRIPMODEL");
            oTripModel.setProperty("/Supcode", sVendor);
        },
        onCaptureWeight: function (oEvent) {
            debugger;
            var oLiveModel = this.getView().getModel("liveModel");

            var oTripModel = this.getView().getModel("TRIPMODEL");

            var sWeight = oLiveModel.getProperty("/Weight");

            var sFirst = oTripModel.getProperty("/Firstwgt");
            var sSecond = oTripModel.getProperty("/Secondwgt");

            if (!sFirst) {

                oTripModel.setProperty("/Firstwgt", sWeight);

            } else if (!sSecond) {

                oTripModel.setProperty("/Secondwgt", sWeight);

                // calculate net weight
                var iNet = parseFloat(sSecond) - parseFloat(sFirst);

                if (iNet < 0) {
                    iNet = parseFloat(sFirst) - parseFloat(sSecond);
                }

                oTripModel.setProperty("/Netwgt", iNet.toString());
            }
            else {
                sap.m.MessageToast.show("Both weights already captured");
            }

        },
        onModelRefresh: function (e) {
            debugger;
        },
        _createEmptyRow: function (sino) {

            return {
                Sino: sino,
                Invoiceno: "",
                Invoicedt: "",
                Pono: "",
                Poitem: "",
                Matnr: "",
                Qty: "",
                poNoItems: [],
                poItemItems: []
            };

        },
        onFieldChange: function () {

            var oModel = this.getView().getModel("ItemModel");
            var aData = oModel.getProperty("/results");

            var oLastRow = aData[aData.length - 1];

            if (oLastRow.Invoiceno ||
                oLastRow.Pono ||
                oLastRow.Matnr ||
                oLastRow.Qty) {

                aData.push(this._createEmptyRow(aData.length + 1));

                oModel.setProperty("/results", aData);
            }

        },
        onDeleteRow: function (oEvent) {

            var oModel = this.getView().getModel("ItemModel");
            var aData = oModel.getProperty("/results");

            var oItem = oEvent.getSource().getParent();
            var iIndex = oItem.getBindingContext("ItemModel").getPath().split("/")[2];

            aData.splice(iIndex, 1);

            for (var i = 0; i < aData.length; i++) {
                aData[i].Sino = i + 1;
            }

            oModel.setProperty("/results", aData);

        },
        onUpdate: function () {
            debugger;
            var that = this;
            var oHeader = this.getView().getModel("TRIPMODEL").getData();
            var aItems = this.getView().getModel("ItemModel").getData().results;

            var sPlant = oHeader.Plant;
            var sTripId = oHeader.TripId;

            var oItems = aItems.filter(function (item) {
                return item.Invoiceno && item.Pono && item.Matnr;
            })
                .map(function (item, index) {
                    return {
                        Plant: sPlant,
                        TripId: sTripId,
                        Sino: (index + 1).toString(),
                        Invoiceno: item.Invoiceno,
                        Invoicedt: item.Invoicedt,
                        Pono: item.Pono,
                        Poitem: item.Poitem,
                        Matnr: item.Matnr,
                        Qty: item.Qty,
                        Uom: item.Uom
                    };
                });

            oHeader.ItemsJson = JSON.stringify(oItems);


            oItems.forEach(function (item, index) {

                // item.Plant = sPlant;
                // item.TripId = sTripId;
                item.Sino = (index + 1).toString();

            });

            debugger;
            //oHeader.to_wgtitem = oItems;
            // oHeader.ItemsJson = JSON.stringify(oItems);

            var oModel = this.getView().getModel(); // main OData model
            var sHeaderPath = "/ZC_MGATEWT_HDR(Plant='" + sPlant + "',TripId='" + sTripId + "')";
            console.log("FirstWeight:", oHeader.Firstwgt);
            console.log("SecondWeight:", oHeader.Secondwgt);
            console.log("NetWeight:", oHeader.Netwgt);
            var oHeaderPayload = {
                Truckno: oHeader.Truckno || "",
                Supcode: oHeader.Supcode || "",

                Firstwgt: oHeader.Firstwgt,
                Refunit: oHeader.Refunit || "KG",
                // Firstwgtdate: oHeader.Firstwgtdate ? this._formatDate(oHeader.Firstwgtdate) : null,
                // Firstwgttime: "PT00H00M00S",

                Secondwgt: oHeader.Secondwgt,
                // Secondwgtdate: oHeader.Secondwgtdate ? this._formatDate(oHeader.Secondwgtdate) : null,
                // Secondwgttime: "PT00H00M00S",

                Userid: oHeader.Userid || "",
                Status: oHeader.Status || "",
                Netwgt: oHeader.Netwgt
            };

            oModel.update(sHeaderPath, oHeaderPayload, {
                success: function () {

                    this._updateItems(oItems);

                }.bind(this),

                error: function (oError) {
                    console.log(oError);
                    sap.m.MessageBox.error("Header Update Failed");
                }
            });
            debugger;
            // var payload = {
            //     Truckno: oHeader.Truckno,
            //     Supcode: oHeader.Supcode,
            //     Firstwgt: parseFloat(oHeader.Firstwgt),
            //     Refunit: oHeader.Refunit,
            //     Firstwgtdate: this._formatDate(oHeader.Firstwgtdate),
            //     Firstwgttime: "PT00H00M00S",//oHeader.Firstwgttime,
            //     Secondwgt: parseFloat(oHeader.Secondwgt || 0),
            //     Secondwgtdate: this._formatDate(oHeader.Secondwgtdate),//oHeader.Secondwgtdate,
            //     Secondwgttime: "PT00H00M00S",//oHeader.Secondwgttime,
            //     Userid: oHeader.Userid,
            //     Status: oHeader.Status,
            //     Netwgt: parseFloat(oHeader.Netwgt || 0),

            //     _wgtitem: //oItems
            //         oItems.map(function (item, index) {
            //             return {
            //                 Sino: (index + 1).toString(),
            //                 Invoiceno: item.Invoiceno,
            //                 Invoicedt: this._formatDate(item.Invoicedt),
            //                 Pono: item.Pono,
            //                 Poitem: item.Poitem,
            //                 Matnr: item.Matnr,
            //                 Qty: parseFloat(item.Qty || 0),
            //                 Uom: item.Uom
            //             };
            //         }.bind(this))
            // };


            // oModel.callFunction("/updateWithItems", {
            //     method: "POST",
            //     urlParameters: {
            //         Plant: sPlant,//oHeader.Plant,
            //         TripId: sTripId,//oHeader.TripId,
            //         // Truckno: oHeader.Truckno,
            //         // Supcode: oHeader.Supcode,
            //         // Firstwgt: oHeader.Firstwgt,
            //         // Refunit: oHeader.Refunit,
            //         // Firstwgtdate: oHeader.Firstwgtdate,
            //         // Firstwgttime: oHeader.Firstwgttime,
            //         // Secondwgt: oHeader.Secondwgt,
            //         // Secondwgtdate: oHeader.Secondwgtdate,
            //         // Secondwgttime: oHeader.Secondwgttime,
            //         // Userid: oHeader.Userid,
            //         // Status: oHeader.Status,
            //         // Netwgt: oHeader.Netwgt,
            //         // ItemsJson: oHeader.ItemsJson
            //     },
            //     payload: payload,
            //     success: function (oData, response) {
            //         MessageBox.success("Updated Successfully");
            //     },
            //     error: function (oError) {
            //         console.log(oError);
            //         debugger;
            //         var oEText = oError.responseText;
            //         MessageBox.error("Update Failed", oEText)
            //     }
            // });

            // var sPath = "/ZC_MGATEWT_HDR(Plant='" + sPlant + "',TripId='" + sTripId + "')/updateWithItems";

            // oModel.create(sPath, payload, {
            //     success: function () {
            //         sap.m.MessageBox.success("Updated Successfully");
            //     },
            //     error: function (oError) {
            //         console.log(oError);
            //         sap.m.MessageBox.error("Update Failed");
            //     }
            // });
            // oModel.create("/updateWithItems", payload, {
            //     urlParameters: {
            //         Plant: "'" + sPlant + "'",
            //         TripId: "'" + sTripId + "'"
            //     },
            //     success: function () {
            //         sap.m.MessageBox.success("Updated Successfully");
            //     },
            //     error: function (oError) {
            //         console.log(oError);
            //         sap.m.MessageBox.error("Update Failed");
            //     }
            // });



            // oModel.callFunction("/updateWithItems", {
            //     method: "POST",
            //     urlParameters: {
            //         Plant: oHeader.Plant,
            //         TripId: oHeader.TripId,
            //         Truckno: oHeader.Truckno,
            //         Supcode: oHeader.Supcode,
            //         Firstwgt: oHeader.Firstwgt,
            //         Refunit: oHeader.Refunit,
            //         Firstwgtdate: oHeader.Firstwgtdate,
            //         Firstwgttime: oHeader.Firstwgttime,
            //         Secondwgt: oHeader.Secondwgt,
            //         Secondwgtdate: oHeader.Secondwgtdate,
            //         Secondwgttime: oHeader.Secondwgttime,
            //         Userid: oHeader.Userid,
            //         Status: oHeader.Status,
            //         Netwgt: oHeader.Netwgt                    

            //     },

            //     // IMPORTANT: pass deep payload manually
            //     payload: oHeader,

            //     success: function (oData) {
            //         sap.m.MessageToast.show("Updated Successfully");
            //     },
            //     error: function (oError) {
            //         console.log(oError);
            //     }
            // });
            // oModel.update(sPath, oHeader, {

            //     success: function (oSuccess) {
            //         console.log(oSuccess);
            //         debugger;
            //         //this.getView().getModel().getData();   
            //         var oTripModel = this.getView().getModel("TRIPMODEL");

            //         // Update TripId in model                    
            //         MessageBox.show("Trip ID Updated Successfully - " + oSuccess.TripId);
            //     }.bind(this),

            //     error: function (oError) {
            //         console.log(oError);
            //         sap.m.MessageToast.show("Error while Updating");
            //     }

            // });


        },
        _updateItems: function (oItems) {

            var oModel = this.getView().getModel();
            var that = this;
            var iSuccess = 0;
            var iError = 0;

            oItems.forEach(function (item, index) {

                var sItemPath = "/ZC_MGATEWT_ITEM(Plant='" + item.Plant +
                    "',TripId='" + item.TripId +
                    "',Sino='" + (index + 1).toString() + "')";

                var oItemPayload = {
                    Invoiceno: item.Invoiceno,
                    Invoicedt: item.Invoicedt ? that._formatDate(item.Invoicedt, true) : null,
                    Pono: item.Pono,
                    Poitem: item.Poitem,
                    Matnr: item.Matnr,
                    Qty: item.Qty,
                    Uom: item.Uom
                };

                oModel.update(sItemPath, oItemPayload, {

                    success: function () {
                        iSuccess++;

                        // Final message after all processed
                        if (iSuccess + iError === oItems.length) {
                            sap.m.MessageBox.success("Updated Successfully");
                        }
                    },

                    error: function (oError) {
                        console.log(oError);
                        iError++;

                        if (iSuccess + iError === oItems.length) {
                            sap.m.MessageBox.error("Some Items Failed to Update");
                        }
                    }

                });

            });
        },
        _formatDate: function (date) {
            if (!date) return null;
            var d = new Date(date);
            if (isNaN(d)) return null;

            // Edm.DateTime with Precision=0 -> YYYY-MM-DDTHH:mm:ss
            var yyyy = d.getFullYear();
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var dd = String(d.getDate()).padStart(2, '0');
            var hh = String(d.getHours()).padStart(2, '0');
            var mi = String(d.getMinutes()).padStart(2, '0');
            var ss = String(d.getSeconds()).padStart(2, '0');

            return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
        },
        _formatNumber: function (val) {
            var num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        },
        // _formatDate: function (oDate) {
        //     if (!oDate) return null;

        //     var d = new Date(oDate);
        //     var yyyy = d.getFullYear();
        //     var mm = String(d.getMonth() + 1).padStart(2, '0');
        //     var dd = String(d.getDate()).padStart(2, '0');

        //     return yyyy + "-" + mm + "-" + dd;
        // },
        _loadPurchaseOrders: function () {
            var sPlant = this.getView().getModel("TRIPMODEL").getProperty("/Plant");

            var oModel = this.getView().getModel();

            oModel.read("/PurchaseOrders", {
                filters: [
                    new sap.ui.model.Filter("Plant", "EQ", sPlant)
                ],
                success: function (oData) {

                    this._poData = oData.results; // store globally

                    // assign PO list to each row
                    var oItemModel = this.getView().getModel("ItemModel");
                    var aRows = oItemModel.getProperty("/results");

                    aRows.forEach(function (row) {
                        row.poNoItems = oData.results;
                        // if a PONO is already saved, assign corresponding PO items
                        if (row.Pono) {
                            row.poItemItems = oData.results.filter(function (po) {
                                return po.purchaseorderno === row.Pono;
                            });
                            if (row.Poitem) {
                                var selItem = row.poItemItems.find(function (po) {
                                    return po.purchaseorderitem === row.Poitem;
                                });
                                if (selItem) {
                                    row.Matnr = selItem.Material;
                                }
                            }
                        } else {
                            row.poItemItems = [];
                        }
                    });

                    oItemModel.setProperty("/results", aRows);

                }.bind(this)
            });
        },
        onPurchaseOrderChange: function (oEvent) {

            var oRowCtx = oEvent.getSource().getBindingContext("ItemModel");
            var oRow = oRowCtx.getObject();

            var sSelectedPO = oRow.Pono;

            // filter items for this PO
            var aFilteredItems = this._poData.filter(function (item) {
                return item.purchaseorderno === sSelectedPO;
            });

            // set PO items for that row
            oRow.poItemItems = aFilteredItems;

            // clear previous selections
            oRow.Poitem = "";
            oRow.Matnr = "";

            oRowCtx.getModel().refresh();
        },
        onPurchaseOrderItemChange: function (oEvent) {

            var oRowCtx = oEvent.getSource().getBindingContext("ItemModel");
            var oRow = oRowCtx.getObject();

            var sItem = oRow.Poitem;

            var oSelected = oRow.poItemItems.find(function (item) {
                return item.purchaseorderitem === sItem;
            });

            if (oSelected) {
                oRow.Matnr = oSelected.Material;
            }

            oRowCtx.getModel().refresh();
        },
        onAddRow: function () {

            var oModel = this.getView().getModel("ItemModel");
            var aData = oModel.getProperty("/results");

            // create new row
            var oNewRow = this._createEmptyRow(aData.length + 1);

            // 🔥 IMPORTANT: also assign PO list to new row
            if (this._poData) {
                oNewRow.poNoItems = this._poData;
                oNewRow.poItemItems = [];
            }

            aData.push(oNewRow);

            oModel.setProperty("/results", aData);
        }

    });
}
);

