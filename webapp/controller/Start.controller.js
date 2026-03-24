sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, Filter, FilterOperator, JSONModel) {
    "use strict";

    return Controller.extend("zmwbi.controller.Start", {

        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("Start").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this.byId("idPlant").setSelectedKey("");
            this.byId("idPlant").setValueState("None");
            this.byId("idPlant").setValueStateText("");

            this.byId("idTruck").setValue("");
            this.byId("idTruck").setValueState("None");
            this.byId("idTruck").setValueStateText("");
        },

        onTruckLiveChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue().toUpperCase();
            oInput.setValue(sValue);
            oInput.setValueState("None");
            oInput.setValueStateText("");
        },

        onVerify: function () {
            var oPlant = this.byId("idPlant");
            var oTruckInput = this.byId("idTruck");

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

            var aFilters = [
                new Filter("Plant", FilterOperator.EQ, sPlant),
                new Filter("Truckno", FilterOperator.EQ, sTruck)
            ];

            oModel.read("/ZC_MGATEWT_HDR", {
                filters: aFilters,
                urlParameters: {
                    "$top": "1"
                },
                success: function (oData) {
                    if (oData.results && oData.results.length > 0) {
                        MessageToast.show("Trip Found");
                        that.oRouter.navTo("Weigh");
                    } else {
                        MessageToast.show("New Trip → Create");

                        var oTrip = {
                            Plant: sPlant,
                            Truckno: sTruck
                        };

                        var oJSON = new JSONModel(oTrip);
                        that.getOwnerComponent().setModel(oJSON, "TRIPMODEL");

                        that.oRouter.navTo("Create");
                    }
                },
                error: function () {
                    MessageToast.show("Error fetching data");
                }
            });
        }
    });
});