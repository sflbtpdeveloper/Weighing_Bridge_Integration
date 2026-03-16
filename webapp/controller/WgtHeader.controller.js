sap.ui.define([
    "sap/ui/core/mvc/Controller"

], function (controller) {
    "use strict";

    return controller.extend("zwbi.controller.WgtHeader", {


        onInit: function () {
            var oModel = this.getOwnerComponent().getModel();
            //this.oRouter.getRoute("RouteApp").attachPatternMatched(this._onObjectMatched, this);
            this.oRouter = this.getOwnerComponent().getRouter();
            // this.getView().byId("myCustomTable").setModel(oModel,"listModel");
        },
        onButtonPress: function () {
            this.oRouter.navTo("Create");
        },
        onRowPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oContext = oItem.getBindingContext();
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
                    that.oRouter.navTo("Create");
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

