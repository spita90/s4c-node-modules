/* NODE-RED-CONTRIB-SNAP4CITY-USER
   Copyright (C) 2018 DISIT Lab http://www.disit.org - University of Florence

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as
   published by the Free Software Foundation, either version 3 of the
   License, or (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU Affero General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>. */
module.exports = function (RED) {

    function GetIOTAppsUsingMyKPIData(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.selectedKPIDataId = config.selectedKPIDataId;
        if (config.kpiId) {
            node.kpiId = config.kpiId.split("-")[0];
            node.kpiValueName = config.kpiId.split("-")[1];
            node.kpiDataType = config.kpiId.split("-")[2];
        }

        node.on('input', function (msg) {
            var s4cUtility = require("./snap4city-utility.js");
            var uid = s4cUtility.retrieveAppID(RED);
            var kpiId = (msg.payload.id ? msg.payload.id : node.kpiId);
            if (kpiId) {
                var startdate = (msg.payload.startdate ? msg.payload.startdate : config.startdate);
                var enddate = (msg.payload.enddate ? msg.payload.enddate : config.enddate);
                var last = (msg.payload.last ? msg.payload.last : config.last);
                var uri = (RED.settings.myPersonalDataUrl ? RED.settings.myPersonalDataUrl : "https://www.snap4city.org/mypersonaldata/api/v1") + "/kpidata/" + kpiId + "/activities";
                var inPayload = msg.payload;
                var accessToken = "";
                accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid);
                if (accessToken != "" && typeof accessToken != "undefined") {
                    var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
                    var xmlHttp = new XMLHttpRequest();
                    console.log(encodeURI(uri + "?sourceRequestFilter=iotapp" + (typeof startdate != "undefined" && startdate != "" ? "&from=" + startdate : "") + (typeof enddate != "undefined" && enddate != "" ? "&to=" + enddate : "") + (typeof last != "undefined" && last != "" ? "&last=" + last : "")));
                    xmlHttp.open("GET", encodeURI(uri + "?sourceRequestFilter=iotapp" + (typeof startdate != "undefined" && startdate != "" ? "&from=" + startdate : "") + (typeof enddate != "undefined" && enddate != "" ? "&to=" + enddate : "") + (typeof last != "undefined" && last != "" ? "&last=" + last : "")), true);
                    xmlHttp.setRequestHeader("Content-Type", "application/json");
                    xmlHttp.setRequestHeader("Authorization", "Bearer " + accessToken);
                    xmlHttp.onload = function (e) {
                        if (xmlHttp.readyState === 4) {
                            if (xmlHttp.status === 200) {
                                if (xmlHttp.responseText != "") {
                                    try {
                                        msg.payload = JSON.parse(xmlHttp.responseText);
                                    } catch (e) {
                                        msg.payload = xmlHttp.responseText;
                                    }
                                } else {
                                    msg.payload = JSON.parse("{\"status\": \"There was some problem\"}");
                                }
                                s4cUtility.eventLog(RED, inPayload, msg, config, "Node-Red", "MyData", uri, "RX");
                                node.send(msg);
                            } else if (xmlHttp.status === 401) {
                                node.error("Unauthorized");
                            } else {
                                console.error(xmlHttp.statusText);
                                node.error(xmlHttp.responseText);
                            }
                        }
                    };
                    xmlHttp.onerror = function (e) {
                        console.error(xmlHttp.statusText);
                        node.error(xmlHttp.responseText);
                    };
                    xmlHttp.send(null);

                } else {
                    node.error("Open the configuration of the node and redeploy");
                }
            } else {
                node.error("KPI ID not configured or sent to input");
            }
        });
    }

    RED.nodes.registerType("get-iotapps-using-my-kpidata", GetIOTAppsUsingMyKPIData);

}