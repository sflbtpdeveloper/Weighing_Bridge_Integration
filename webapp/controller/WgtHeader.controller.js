sap.ui.define([
    "sap/ui/core/mvc/Controller"

], function (controller) {
    "use strict";

    return controller.extend("zwbi.controller.WgtHeader", {


        onInit: function () {
            var oModel = this.getOwnerComponent().getModel();
            //this.oRouter.getRoute("RouteApp").attachPatternMatched(this._onObjectMatched, this);
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("Weigh").attachPatternMatched(this._onObjectMatched, this);

            var oTableModel = this.getOwnerComponent().getModel("TABLEMODEL");
            debugger;
            //this.getView().setModel(oTableModel, "TABLEMODEL");
            this.getView().byId("myCustomTable").setModel(oTableModel, "TABLEMODEL");
        },
        _onObjectMatched: function () {
            debugger;
            var oTableModel = this.getOwnerComponent().getModel("TABLEMODEL");

            if (oTableModel) {
                this.byId("myCustomTable").setModel(oTableModel, "TABLEMODEL");
            }
        },
        onButtonPress: function () {
            this.oRouter.navTo("Create");
        },
        onRowPress: function (oEvent) {
            debugger;
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext("TABLEMODEL");
            var oData = oContext.getObject();

            // create JSON model
            var oModel = new sap.ui.model.json.JSONModel(oData);
            this.getOwnerComponent().setModel(oModel, "TRIPMODEL");


            // OData model
            var oModel = this.getOwnerComponent().getModel();

            var sPath = "/ZC_MGATEWT_HDR(Plant='" + oData.Plant + "',TripId='" + oData.TripId + "')/to_wgtitem";

            var that = this;
            debugger;
            oModel.read(sPath, {
                success: function (oResponse) {

                    var oItemModel = new sap.ui.model.json.JSONModel(oResponse);
                    that.getOwnerComponent().setModel(oItemModel, "ItemModel");

                    // Navigate after items fetched
                    that.oRouter.navTo("Update");
                },
                error: function (oError) {
                    console.log(oError);
                }
            });


            // this.oRouter.navTo("Create");

        }
    });
}
);

