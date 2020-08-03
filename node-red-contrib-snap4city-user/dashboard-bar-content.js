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

    function BarContentNode(config) {
        var WebSocket = require('ws');
        var util = require('util');
        var s4cUtility = require("./snap4city-utility.js");
        var uid = s4cUtility.retrieveAppID(RED);
        RED.nodes.createNode(this, config);
        var node = this;
        var wsServer = (RED.settings.wsServerUrl ? RED.settings.wsServerUrl : "wss://dashboard.km4city.org:443/server");
        var wsServerHttpOrigin = (RED.settings.wsServerHttpOrigin ? RED.settings.wsServerHttpOrigin : "https://www.snap4city.org");
        node.ws = null;
        node.notRestart = false;
        node.name = config.name;
        node.username = config.username;
        node.flowName = config.flowName;
        node.selectedDashboardId = config.selectedDashboardId;
        node.dashboardId = config.dashboardId;
        node.metricName = "NR_" + node.id.replace(".", "_");
        node.metricType = config.metricType;
        node.startValue = config.startValue;
        node.metricShortDesc = config.metricName;
        node.metricFullDesc = config.metricName;
        node.httpRoot = null;

        node.on('input', function (msg) {
            util.log("Flow input received for bar-content node " + node.name + ": " + JSON.stringify(msg));

            var timeout = 0;
            if ((new Date().getTime() - node.wsStart) > parseInt(RED.settings.wsReconnectTimeout ? RED.settings.wsReconnectTimeout : 1200) * 1000) {
                if (node.ws != null) {
                    node.ws.removeListener('error', node.wsErrorCallback);
                    node.ws.removeListener('open', node.wsOpenCallback);
                    node.ws.removeListener('message', node.wsMessageCallback);
                    node.ws.removeListener('close', node.wsCloseCallback);
                    node.ws.removeListener('pong', node.wsHeartbeatCallback);
                    node.notRestart = true;
                    node.ws.terminate();
                    node.ws = null;
                } else {
                    util.log("Why ws is null? I am in node.on('input'")
                }
                node.ws = new WebSocket(wsServer, {
                    origin: wsServerHttpOrigin
                });
                node.ws.on('error', node.wsErrorCallback);
                node.ws.on('open', node.wsOpenCallback);
                node.ws.on('message', node.wsMessageCallback);
                node.ws.on('close', node.wsCloseCallback);
                node.ws.on('pong', node.wsHeartbeatCallback);
                util.log("bar-content node " + node.name + " is reconnetting to open WebSocket");
                timeout = 1000;
            }
            node.wsStart = new Date().getTime();

            var newMetricData = {
                msgType: "AddMetricData",
                nodeId: node.id,
                metricName: encodeURIComponent(node.metricName),
                metricType: node.metricType,
                newValue: msg.payload,
                appId: uid,
                user: node.username,
                flowId: node.z,
                flowName: node.flowName,
                accessToken: s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid)
            };

            setTimeout(function () {
                try {
                    node.ws.send(JSON.stringify(newMetricData));
                } catch (e) {
                    util.log("Error sending data to WebSocket for bar-content node " + node.name + ": " + e);
                }
            }, timeout);

            s4cUtility.eventLog(RED, msg, newMetricData, config, "Node-Red", "Dashboard", wsServer, "TX");

        });

        node.on('close', function (removed, closedDoneCallback) {
            if (removed) {
                // Cancellazione nodo
                util.log("bar-content node " + node.name + " is being removed from flow");
                node.deleteMetric();
            } else {
                // Riavvio nodo
                util.log("bar-content node " + node.name + " is being rebooted");
                node.notRestart = true;
                node.ws.terminate();
            }
            clearInterval(node.pingInterval);
            closedDoneCallback();
        });

        node.wsOpenCallback = function () {
            if (node.dashboardId != null && node.dashboardId != "") {
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "connected to " + wsServer
                });

                if (RED.settings.hasOwnProperty('httpRoot')) {
                    if (RED.settings.httpRoot !== '/') {
                        node.httpRoot = RED.settings.httpRoot;
                    } else {
                        node.httpRoot = null;
                    }
                }

                //Registrazione della nuova metrica presso il Dashboard Manager
                var payload = {
                    msgType: "AddEditMetric",
                    metricName: encodeURIComponent(node.metricName),
                    metricType: node.metricType,
                    nodeId: node.id,
                    startValue: node.startValue,
                    user: node.username,
                    metricShortDesc: node.metricShortDesc,
                    metricFullDesc: node.metricFullDesc,
                    appId: uid,
                    flowId: node.z,
                    flowName: node.flowName,
                    widgetType: "widgetBarContent",
                    widgetTitle: node.name,
                    dashboardTitle: '',
                    dashboardId: node.dashboardId,
                    httpRoot: node.httpRoot,
                    accessToken: s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid)
                };

                //util.log(payload);
                if (node.pingInterval == null) {
                    node.pingInterval = setInterval(function () {
                        //util.log(node.name + "ping");
                        if (node.ws != null) {
                            try {
                                node.ws.ping();
                            } catch (e) {
                                util.log("Errore on Ping " + e);
                            }
                        }
                    }, 30000);
                }

                util.log("Bar-content node " + node.name + " IS GOING TO CONNECT WS");
                if (payload.accessToken != "") {
                    setTimeout(function () {
                        node.ws.send(JSON.stringify(payload));
                    }, Math.random() * 2000)
                } else {
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Authentication Problem"
                    });
                }
            } else {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "No dashboard selected"
                });
            }
        };

        node.wsMessageCallback = function (data) {
            var response = JSON.parse(data);
            util.log(response);
            switch (response.msgType) {
                case "AddEditMetric":
                    if (response.result === "Ok") {
                        node.widgetUniqueName = response.widgetUniqueName;
                        util.log("WebSocket server correctly added/edited metric type for bar-content node " + node.name + ": " + response.result);
                        if (node.intervalID != null) {
                            clearInterval(node.intervalID);
                            node.intervalID = null;
                        }
                    } else {
                        //TBD - CASI NEGATIVI DA FARE
                        util.log("WebSocket server could not add/edit metric type for bar-content node " + node.name + ": " + response.result);
                        node.status({
                            fill: "red",
                            shape: "dot",
                            text: response.error
                        });
                        node.error(response.error);
                    }
                    break;

                case "DelMetric":
                    if (response.result === "Ok") {
                        util.log("WebSocket server correctly deleted metric type for bar-content node " + node.name + ": " + response.result);
                    } else {
                        //TBD - CASI NEGATIVI DA FARE
                        util.log("WebSocket server could not delete metric type for bar-content node " + node.name + ": " + response.result);
                    }
                    util.log("Closing webSocket server for bar-content node " + node.name);
                    node.notRestart = true;
                    node.ws.terminate();
                    break;

                default:
                    util.log(response.msgType);
                    break;
            }
        };

        node.wsCloseCallback = function (e) {
            util.log("bar-content node " + node.name + " closed WebSocket");
            util.log("bar-content closed reason " + e);
            if (!(node.dashboardId != null && node.dashboardId != "")) {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "No dashboard selected"
                });
            } else {
                node.status({
                    fill: "red",
                    shape: "ring",
                    text: "lost connection from " + wsServer
                });
            }

            if (node.ws != null) {
                node.ws.removeListener('error', node.wsErrorCallback);
                node.ws.removeListener('open', node.wsOpenCallback);
                node.ws.removeListener('message', node.wsMessageCallback);
                node.ws.removeListener('close', node.wsCloseCallback);
                node.ws.removeListener('pong', node.wsHeartbeatCallback);
                node.ws = null;
            } else {
                util.log("Why ws is null? I am in node.wsCloseCallback")
            }

            var wsServerRetryActive = (RED.settings.wsServerRetryActive ? RED.settings.wsServerRetryActive : "yes");
            var wsServerRetryTime = (RED.settings.wsServerRetryTime ? RED.settings.wsServerRetryTime : 30);
            //util.log("bar-content wsServerRetryActive: " + wsServerRetryActive);
            //util.log("bar-content node.notRestart: " + node.notRestart);
            if (wsServerRetryActive === 'yes' && !node.notRestart) {
                util.log("bar-content node " + node.name + " will try to reconnect to WebSocket in " + parseInt(wsServerRetryTime) + "s");
                if (!node.intervalID) {
                    node.intervalID = setInterval(node.wsInit, parseInt(wsServerRetryTime) * 1000);
                }
            }
            node.notRestart = false;
        };

        node.wsErrorCallback = function (e) {
            util.log("bar-content node " + node.name + " got WebSocket error: " + e);
        };

        node.deleteMetric = function () {
            util.log("Deleting metric via webSocket for bar-content node " + node.name);
            var newMsg = {
                msgType: "DelMetric",
                nodeId: node.id,
                metricName: encodeURIComponent(node.metricName),
                metricType: node.metricType,
                user: node.username,
                appId: uid,
                flowId: node.z,
                flowName: node.flowName,
                accessToken: s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid)
            };

            try {
                node.ws.send(JSON.stringify(newMsg));
            } catch (e) {
                util.log("Error deleting metric via webSocket for bar-content node " + node.name + ": " + e);
            }
        };

        node.wsHeartbeatCallback = function () {

        };



        //Lasciare così, sennò va in timeout!!! https://nodered.org/docs/creating-nodes/node-js#closing-the-node
        node.closedDoneCallback = function () {
            util.log("bar-content node " + node.name + " has been closed");
        };

        node.wsInit = function (e) {
            util.log("bar-content node " + node.name + " is trying to open WebSocket");
            try {
                node.status({
                    fill: "yellow",
                    shape: "dot",
                    text: "connecting to " + wsServer
                });
                if (node.ws == null) {
                    node.ws = new WebSocket(wsServer, {
                        origin: wsServerHttpOrigin
                    });
                    node.ws.on('error', node.wsErrorCallback);
                    node.ws.on('open', node.wsOpenCallback);
                    node.ws.on('message', node.wsMessageCallback);
                    node.ws.on('close', node.wsCloseCallback);
                    node.ws.on('pong', node.wsHeartbeatCallback);
                    node.wsStart = new Date().getTime();
                } else {
                    util.log("bar-content node " + node.name + " already open WebSocket");
                }
            } catch (e) {
                util.log("bar-content node " + node.name + " could not open WebSocket");
                node.status({
                    fill: "red",
                    shape: "ring",
                    text: "unable to connect to " + wsServer
                });
                node.wsCloseCallback();
            }
        };

        //Inizio del "main"
        try {
            node.wsInit();
        } catch (e) {
            util.log("bar-content node " + node.name + " got main exception connecting to WebSocket");
        }

    }

    RED.nodes.registerType("bar-content", BarContentNode);

    RED.httpAdmin.get('/dashboardManagerBaseUrl', function (req, res) {
        var dashboardManagerBaseUrl = (RED.settings.dashboardManagerBaseUrl ? RED.settings.dashboardManagerBaseUrl : "https://main.snap4city.org");
        var dashboardSecret = (RED.settings.dashboardSecret ? RED.settings.dashboardSecret : "45awwprty_zzq34");
        res.send({
            "dashboardManagerBaseUrl": dashboardManagerBaseUrl,
            "dashboardSecret": dashboardSecret
        });
    });

    RED.httpAdmin.get('/dashboardList', RED.auth.needsPermission('impulse-button.read'), function (req, res) {
        var s4cUtility = require("./snap4city-utility.js");
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttp = new XMLHttpRequest();
        var xmlHttp2 = new XMLHttpRequest();
        var dashboardManagerBaseUrl = (RED.settings.dashboardManagerBaseUrl ? RED.settings.dashboardManagerBaseUrl : "https://main.snap4city.org");
        var dashboardSecret = (RED.settings.dashboardSecret ? RED.settings.dashboardSecret : "45awwprty_zzq34");
        var accessToken = s4cUtility.retrieveAccessToken(RED, null, null, null);
        var uid = s4cUtility.retrieveAppID(RED);
        var username = "";
        var url = (RED.settings.ownershipUrl ? RED.settings.ownershipUrl : "https://www.snap4city.org/ownership-api/");
        if (accessToken != "" && url != "") {
            xmlHttp.open("GET", encodeURI(url + "v1/list/?elementId=" + uid + "&elementType=AppId&accessToken=" + accessToken), true); // false for synchronous request
            xmlHttp.onload = function (e) {
                if (xmlHttp.readyState === 4) {
                    if (xmlHttp.status === 200) {
                        if (xmlHttp.responseText != "") {
                            try {
                                username = JSON.parse(xmlHttp.responseText)[0].username;
                            } catch (e) {
                                username = "";
                            }
                        }
                        if (username != "" && uid != "" && accessToken != "" && dashboardSecret != "" && dashboardManagerBaseUrl != "") {
                            xmlHttp2.open("GET", encodeURI(dashboardManagerBaseUrl + "/api/nodeRedDashboardsApi.php?v3&secret=" + dashboardSecret + "&username=" + username + "&accessToken=" + accessToken), true); // false for synchronous request
                            xmlHttp2.onload = function (e) {
                                if (xmlHttp2.readyState === 4) {
                                    if (xmlHttp2.status === 200) {
                                        if (xmlHttp2.responseText != "") {
                                            try {
                                                var response = JSON.parse(xmlHttp2.responseText);
                                                res.send({
                                                    "dashboardList": response,
                                                    "username": username
                                                });
                                            } catch (e) {
                                                res.status(500).send({
                                                    "error": "Parsing Error of the list"
                                                });
                                            }
                                        } else {
                                            console.log("Empty Response Text");
                                            res.status(500).send({
                                                "error": "Empty Response Text"
                                            });
                                        }
                                    } else {
                                        console.error(xmlHttp.statusText);
                                        res.status(xmlHttp.status).send({
                                            "error": "The status returned from the service that provide the list"
                                        });
                                    }
                                } else {
                                    console.log(xmlHttp.statusText)
                                    res.status(500).send({
                                        "error": "Something goes wrong. XMLHttpRequest.readyState = " + xmlHttp2.readyState
                                    });
                                }
                            };
                            xmlHttp2.onerror = function (e) {
                                console.error(xmlHttp2.statusText);
                                res.status(500).send({
                                    "error": "Cannot call the url to get the list"
                                });
                            };
                            xmlHttp2.send(null);
                        } else {
                            console.log("Empty Response Text");
                            res.status(500).send({
                                "error": "Empty Response Text"
                            });
                        }
                    } else {
                        console.error(xmlHttp.statusText);
                        res.status(xmlHttp.status).send({
                            "error": "The status returned from the service that provide the list"
                        });
                    }
                } else {
                    console.log(xmlHttp.statusText)
                    res.status(500).send({
                        "error": "Something goes wrong. XMLHttpRequest.readyState = " + xmlHttp.readyState
                    });
                }
            };
            xmlHttp.onerror = function (e) {
                console.error(xmlHttp.statusText);
                res.status(500).send({
                    "error": "Cannot call the url to get the list"
                });
            };
            xmlHttp.send(null);
        } else {
            res.status(500).send({
                "error": "Cannot get the accessToken"
            });
        }
    });

    RED.httpAdmin.post('/createDashboard', RED.auth.needsPermission('impulse-button.read'), function (req, res) {
        var s4cUtility = require("./snap4city-utility.js");
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttp = new XMLHttpRequest();
        var dashboardManagerBaseUrl = (RED.settings.dashboardManagerBaseUrl ? RED.settings.dashboardManagerBaseUrl : "https://main.snap4city.org");
        var accessToken = s4cUtility.retrieveAccessToken(RED, null, null, null);
        var uid = s4cUtility.retrieveAppID(RED);
        console.log(encodeURI(dashboardManagerBaseUrl + "/controllers/createDashboardFromNR.php?dashboardTitle=" + req.body.dashboardTitle));
        xmlHttp.open("GET", encodeURI(dashboardManagerBaseUrl + "/controllers/createDashboardFromNR.php?dashboardTitle=" + req.body.dashboardTitle + "&accessToken=" + accessToken), true); // false for synchronous request
        xmlHttp.onload = function (e) {
            console.log(xmlHttp.responseText);
            res.send(xmlHttp.responseText);
        };
        xmlHttp.onerror = function (e) {
            console.error(xmlHttp.statusText);
        };
        xmlHttp.send(null);
    });

};