sap.ui.define([    
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/core/ws/WebSocket"

], function (controller,MessageBox,WebSocket) {
    "use strict";

    return controller.extend("zmwbi.controller.Create", {


    onInit: function () {       
            var that = this;                 
            var oModel = this.getOwnerComponent().getModel();            
            //this.oRouter.getRoute("RouteApp").attachPatternMatched(this._onObjectMatched, this);
            this.oRouter = this.getOwnerComponent().getRouter();
            // this.getView().byId("myCustomTable").setModel(oModel,"listModel");
            // if(!DeviceMotionEvent.support.websocket) {
            //     MessageBox.error("Websocket not supporting");
            //     return;
            // }

            var oLiveModel = new sap.ui.model.json.JSONModel({
                    Weight: ""
                });

                this.getView().setModel(oLiveModel, "liveModel");            

            this.websocket = new WebSocket("/sap/bc/apc/sap/zapc_wb");
            this.websocket.attachOpen(function (e){
                debugger;
                console.log("websocket connected..!")

            });

            this.websocket.attachMessage(function(oEvent){
                debugger;
                const message = JSON.parse(oEvent.getParameter("data"))

                var oModel = this.getView().getModel("liveModel");

                oModel.setProperty("/Weight", message.Weight);

                sap.m.MessageToast.show("Weight Sent by " , message.Sender);

            }.bind(this));


            this.websocket.attachClose(function(oEvent){                                
                sap.m.MessageToast.show("Websocket connection is closed");

            }.bind(this));            
    },
    onModelRefresh: function(e){
        debugger;
    }

    });
}
);

