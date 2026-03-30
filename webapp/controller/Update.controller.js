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
            this.getView().setModel(oTripModel, "TRIPMODEL");
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
                Qty: ""
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

            var oItems = aItems.filter(function (item) {
                return item.Invoiceno && item.Pono && item.Matnr;
            });

            var sPlant = oHeader.Plant;
            var sTripId = oHeader.TripId;
            oItems.forEach(function (item, index) {

                item.Plant = sPlant;
                item.TripId = sTripId;
                item.Sino = (index + 1).toString();

            });

            debugger;
            //oHeader.to_wgtitem = oItems;
            oHeader.ItemsJson = JSON.stringify(oItems);

            var oModel = this.getView().getModel(); // main OData model
            var sPath = "/ZC_MGATEWT_HDR(Plant='" + sPlant + "',TripId='" + sTripId + "')";

            debugger;

            oModel.callFunction("/updateWithItems", {
                method: "POST",
                urlParameters:{
                    Plant: oHeader.Plant,
                    TripId: oHeader.TripId,
                    Truckno: oHeader.Truckno,
                    Supcode: oHeader.Supcode,
                    Firstwgt: oHeader.Firstwgt,
                    Refunit: oHeader.Refunit,
                    Firstwgtdate: oHeader.Firstwgtdate,
                    Firstwgttime: oHeader.Firstwgttime,
                    Secondwgt: oHeader.Secondwgt,
                    Secondwgtdate: oHeader.Secondwgtdate,
                    Secondwgttime: oHeader.Secondwgttime,
                    Userid: oHeader.Userid,
                    Status: oHeader.Status,
                    Netwgt: oHeader.Netwgt    ,
                    ItemsJson : oHeader.ItemsJson
                },
                success: function (oData,response) {
                    sap.m.MessageToast.show("Updated Successfully");
                },
                error: function (oError) {
                    console.log(oError);
                }
            });

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


        }

    });
}
);

