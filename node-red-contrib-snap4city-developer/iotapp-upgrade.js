/* NODE-RED-CONTRIB-SNAP4CITY-DEVELOPER
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

    function IotAppUpgrade(config) {
        var s4cUtility = require("./snap4city-utility.js");
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttp = new XMLHttpRequest();
        RED.nodes.createNode(this, config);
        var node = this;

        node.on('input', function (msg) {
            var inPayload = msg.payload;
            var accessToken = "";
            var idIOTApp = (msg.payload.id ? msg.payload.id : config.idIOTApp);
            var uri = "https://www.snap4city.org/snap4city-application-api/v1/";
            var uid = s4cUtility.retrieveAppID(RED);
            accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid);
            if (accessToken != "" && typeof accessToken != "undefined") {
                console.log(encodeURI(uri + "?op=upgrade_app&id=" + idIOTApp));
                xmlHttp.open("GET", encodeURI(uri + "?op=upgrade_app&id=" + idIOTApp + "&accessToken=" + accessToken), true);
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
                            s4cUtility.eventLog(RED, inPayload, msg, config, "Node-Red", "IotAppUpgrade", uri, "RX");
                            node.send(msg);
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
                console.log("Problem Access Token");
            };
        });

    }
    RED.nodes.registerType("iotapp-upgrade", IotAppUpgrade);
}