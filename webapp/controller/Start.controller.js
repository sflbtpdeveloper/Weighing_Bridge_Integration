sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"

], function (Controller, MessageToast, MessageBox, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("zmwbi.controller.Start", {

        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("Start").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: function () {
            this.byId("idsPlant").setSelectedKey("");
            this.byId("idsPlant").setValueState("None");
            this.byId("idsPlant").setValueStateText("");

            this.byId("idsTruck").setValue("");
            this.byId("idsTruck").setValueState("None");
            this.byId("idsTruck").setValueStateText("");
        },
        onTruckLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue().toUpperCase();
            oInput.setValue(sValue);
            oInput.setValueState("None");
            oInput.setValueStateText("");
        },    
         _clearModels: function () {
            var oItemModel = this.getOwnerComponent().getModel("ItemModel");
            if (oItemModel) {
                oItemModel.setData({ results: [] });
            }

            var oTripModel = this.getOwnerComponent().getModel("TRIPMODEL");
            if (oTripModel) {
                oTripModel.setData({});
            }
        },    
        onVerify: function () {

            var oPlant = this.byId("idsPlant");
            var oTruckInput = this.byId("idsTruck");

            var sPlant = oPlant.getSelectedKey();
            var sTruck = oTruckInput.getValue().trim().toUpperCase();

            oTruckInput.setValue(sTruck);

            oPlant.setValueState("None");
            oPlant.setValueStateText("");
            oTruckInput.setValueState("None");
            oTruckInput.setValueStateText("");

            var bValid = true;

            if (!sPlant) {
                oPlant.setValueState("Error");
                oPlant.setValueStateText("Plant is required");
                bValid = false;
            }

            if (!sTruck) {
                oTruckInput.setValueState("Error");
                oTruckInput.setValueStateText("Truck number is required");
                bValid = false;
            }

            if (!bValid) {
                MessageToast.show("Please fill all required fields");
                return;
            }

            var oTruckRegex = /^[A-Za-z]{2}[0-9]{2}[A-Za-z]{2}[0-9]{4}$/;

            if (!oTruckRegex.test(sTruck)) {
                oTruckInput.setValueState("Error");
                oTruckInput.setValueStateText(
                    "Format: 2 letters, 2 digits, 2 letters, 4 digits "
                );
                MessageToast.show("Invalid truck number format");
                return;
            }

            var oModel = this.getOwnerComponent().getModel();
            var that = this;


            var sPath = "/ZC_MGATEWT_HDR?$filter=Plant eq '" + sPlant + "' " +
                "and Truckno eq " + "'" + sTruck + "'";

            var aFilters = [
                new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, sPlant),
                new sap.ui.model.Filter("Truckno", sap.ui.model.FilterOperator.EQ, sTruck),
                new sap.ui.model.Filter("Status", sap.ui.model.FilterOperator.EQ, 'O')
            ];

            debugger;
            oModel.read("/ZC_MGATEWT_HDR", {
                filters: aFilters,
                success: function (oData) {

                    if (oData.results.length > 0) {

                        MessageToast.show("Trip Found");
                        var oTableModel = new sap.ui.model.json.JSONModel();
                        oTableModel.setData({
                            items: oData.results
                        });
                        that._clearModels();  
                        // 🔥 Set model to view (or component)
                        that.getOwnerComponent().setModel(oTableModel, "TABLEMODEL");
                        that.getOwnerComponent().getRouter().navTo("Weigh");

                    } else {

                        MessageToast.show("New Trip → Create");

                        var oTrip = {
                            Plant: sPlant,
                            Truckno: sTruck
                        };
                        that._clearModels();
                        var oJSON = new sap.ui.model.json.JSONModel(oTrip);

                        that.getOwnerComponent().setModel(oJSON, "TRIPMODEL");

                        that.getOwnerComponent().getRouter().navTo("Create");
                    }
                },

                error: function () {
                    MessageToast.show("Error fetching data");
                }
            });
        }

    });
});