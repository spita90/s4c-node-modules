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

    function PlumberDataAnalytic(config) {
        var util = require('util');
        var s4cUtility = require("./snap4city-utility.js");
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttp = new XMLHttpRequest();
        RED.nodes.createNode(this, config);
        var node = this;
        node.baseUrl = config.baseurl;
        node.relativeUrl = config.relativeurl;
        node.lock = false;
        node.on('input', function (msg) {
            if (!node.lock) {
                node.lock = true;
                node.lockTimeout = setTimeout(function () {
                    node.lock = false
                }, 600000);
                var stringParameters = "";
                for (var parameter in msg.payload) {
                    stringParameters = stringParameters + parameter + "=" + msg.payload[parameter] + "&";
                }
                var uri = node.baseUrl + node.relativeUrl;
                var inPayload = msg.payload;


                console.log(encodeURI(uri + "?" + stringParameters));
                xmlHttp.open("GET", encodeURI(uri + "?" + stringParameters), true); // false for synchronous request
                xmlHttp.onload = function (e) {
                    node.lock = false;
                    clearTimeout(node.lockTimeout);
                    msg.payload = {
                        "request": inPayload,
                        "response": ""
                    }
                    if (xmlHttp.readyState === 4) {
                        if (xmlHttp.status === 200) {
                            if (xmlHttp.responseText != "") {
                                try {
                                    msg.payload.response = JSON.parse(xmlHttp.responseText);
                                } catch (e) {
                                    msg.payload.response = xmlHttp.responseText;
                                }
                            } else {
                                msg.payload.response = JSON.parse("{\"status\": \"There was some problem\"}");
                            }
                            s4cUtility.eventLog(RED, inPayload, msg, config, "Node-Red", "PlumberDataAnalytic", uri, "RX");
                            node.send(msg);
                        } else {
                            console.error(xmlHttp.statusText);

                            if (xmlHttp.status == 502) {
                                node.error("Something went wrong. Check the correctness of the R script. Also the plumber's annotation.");
                            } else {
                                node.error(xmlHttp.responseText);
                            }
                        }
                    }
                    var xmlHttp2 = new XMLHttpRequest();
                    var idIOTApp = node.baseUrl.replace("https://iot-app.snap4city.org/plumber/", "");
                    var uri = "https://www.snap4city.org/snap4city-application-api/v1/";
                    var uid = s4cUtility.retrieveAppID(RED);
                    var accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid);
                    if (accessToken != "" && typeof accessToken != "undefined") {
                        console.log(encodeURI(uri + "?op=restart_app&id=" + idIOTApp));
                        xmlHttp2.open("GET", encodeURI(uri + "?op=restart_app&id=" + idIOTApp + "&accessToken=" + accessToken), true);
                        xmlHttp2.onload = function (e) {
                            util.log(xmlHttp2.responseText);
                        };
                        xmlHttp2.onerror = function (e) {
                            util.log(xmlHttp2.responseText);
                        };
                        xmlHttp2.send(null);
                    }
                };
                xmlHttp.onerror = function (e) {
                    console.error(xmlHttp.statusText);
                    node.error(xmlHttp.responseText);
                };
                xmlHttp.send(null);
            } else {
                node.error("Already sent a request, wait for the answer");
            }
        });

        node.on('close', function (removed, done) {
            var util = require('util');
            var s4cUtility = require("./snap4city-utility.js");
            if (removed) {
                // Cancellazione nodo
                util.log("plumber-data-analytic node " + node.name + " is being removed from flow");
                var accessToken = "";
                var uri = "https://www.snap4city.org/snap4city-application-api/v1/";
                var uid = s4cUtility.retrieveAppID(RED);
                accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid);
                if (accessToken != "" && typeof accessToken != "undefined") {
                    util.log(encodeURI(uri + "?op=rm_app&id=" + node.baseUrl.replace("https://iot-app.snap4city.org/plumber/", "") + "&accessToken=" + accessToken));
                    xmlHttp.open("GET", encodeURI(uri + "?op=rm_app&id=" + node.baseUrl.replace("https://iot-app.snap4city.org/plumber/", "") + "&accessToken=" + accessToken), true);
                    xmlHttp.onload = function (e) {
                        if (xmlHttp.readyState === 4) {
                            if (xmlHttp.status === 200) {
                                util.log(xmlHttp.responseText);
                                util.log("plumber-data-analytic app is deleted");
                            }
                        } else {
                            util.log("plumber-data-analytic app is NOT deleted (not 200), status: " + xmlHttp.status);
                        }
                        done();
                    }
                };
                xmlHttp.onerror = function (e) {
                    util.log("plumber-data-analytic app is NOT deleted (inside ERROR)");
                    done();
                };
                xmlHttp.send(null);
            } else {
                // Riavvio nodo
                util.log("plumber-data-analytic node " + node.name + " is being rebooted");
                done();
            }
        });
    }
    RED.nodes.registerType("plumber-data-analytic", PlumberDataAnalytic);
}