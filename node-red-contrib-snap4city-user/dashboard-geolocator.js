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

    function DashboardGeolocator(config) {
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
        node.name = "NR_" + node.id.replace(".", "_");;
        node.widgetTitle = config.name;
        node.username = config.username;
        node.flowName = config.flowName;
        node.selectedDashboardId = config.selectedDashboardId;
        node.dashboardId = config.dashboardId;
        node.valueType = "geolocator";
        node.startValue = "Off";
        node.minValue = null;
        node.maxValue = null;
        node.offValue = null;
        node.onValue = null;
        node.domain = "geolocator";
        node.httpRoot = null;

        node.on('close', function (removed, closedDoneCallback) {
            if (removed) {
                // Cancellazione nodo
                util.log("dashboard-geolocator node " + node.name + " is being removed from flow");

                node.deleteEmitter();
            } else {
                // Riavvio nodo
                util.log("dashboard-geolocator node " + node.name + " is being rebooted");
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

                var payload = {
                    msgType: "AddEmitter",
                    name: node.name,
                    valueType: node.valueType,
                    user: node.username,
                    startValue: node.startValue,
                    domainType: node.domain,
                    offValue: node.offValue,
                    onValue: node.onValue,
                    minValue: node.minValue,
                    maxValue: node.maxValue,
                    endPointPort: (RED.settings.externalPort ? RED.settings.externalPort : 1895),
                    endPointHost: (RED.settings.dashInNodeBaseUrl ? RED.settings.dashInNodeBaseUrl : "'0.0.0.0'"),
                    httpRoot: node.httpRoot,
                    appId: uid,
                    flowId: node.z,
                    flowName: node.flowName,
                    nodeId: node.id,
                    widgetType: "widgetGeolocator",
                    widgetTitle: node.widgetTitle,
                    dashboardTitle: "",
                    dashboardId: node.dashboardId,
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

                util.log("dashboard-geolocator node " + node.name + " IS GOING TO CONNECT WS");
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
                case "AddEmitter":
                    if (response.result === "Ok") {
                        util.log("WebSocket server correctly added/edited emitter type for dashboard-geolocator node " + node.name + ": " + response.result);
                        node.status({
                            fill: "green",
                            shape: "dot",
                            text: "Created on dashboard"
                        });
                        if (node.intervalID != null) {
                            clearInterval(node.intervalID);
                            node.intervalID = null;
                        }
                        if (typeof node.widgetUniqueName == "undefined") {
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
                            node.wsInit();
                        }
                        node.widgetUniqueName = response.widgetUniqueName;
                    } else {
                        //TBD - CASI NEGATIVI DA FARE
                        util.log("WebSocket server could not add/edit emitter type for dashboard-geolocator node " + node.name + ": " + response.result);
                        node.status({
                            fill: "red",
                            shape: "dot",
                            text: response.error
                        });
                        node.error(response.error);
                    }
                    break;

                case "DelEmitter":
                    if (response.result === "Ok") {
                        util.log("WebSocket server correctly deleted emitter type for dashboard-geolocator node " + node.name + ": " + response.result);
                    } else {
                        //TBD - CASI NEGATIVI DA FARE
                        util.log("WebSocket server could not delete emitter type for dashboard-geolocator node " + node.name + ": " + response.result);
                    }
                    util.log("Closing webSocket server for dashboard-geolocator node " + node.name);
                    node.notRestart = true;
                    node.ws.terminate();
                    break;
                case "DataToEmitter":
                    if (response.newValue != "dashboardDeleted") {
                        node.status({
                            fill: "green",
                            shape: "dot",
                            text: "connected to " + wsServer
                        });
                        var completeResponse = JSON.parse(response.newValue.replace(/\\"/g, "\""));
                        var msgs = [{
                            payload: completeResponse
                        }, {
                            payload: {
                                "latitude": completeResponse.latitude
                            }
                        }, {
                            payload: {
                                "longitude": completeResponse.longitude
                            }
                        }, {
                            payload: {
                                "accuracy": completeResponse.accuracy
                            }
                        }, {
                            payload: {
                                "altitude": completeResponse.altitude
                            }
                        }, {
                            payload: {
                                "altitudeAccuracy": completeResponse.altitudeAccuracy
                            }
                        }, {
                            payload: {
                                "heading": completeResponse.heading
                            }
                        }, {
                            payload: {
                                "speed": completeResponse.speed
                            }
                        }];

                        node.send(msgs);
                        node.ws.send(JSON.stringify({
                            msgType: "DataToEmitterAck",
                            widgetUniqueName: node.widgetUniqueName,
                            result: "Ok",
                            msgId: response.msgId,
                            accessToken: s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid)
                        }));
                    } else {
                        node.status({
                            fill: "red",
                            shape: "dot",
                            text: "Dashboard deleted"
                        });

                    }
                    s4cUtility.eventLog(RED, msgs, msgs, config, "Node-Red", "Dashboard", RED.settings.httpRoot + node.name, "RX");
                    break;
                default:
                    util.log(response.msgType);
                    break;
            }
        };

        node.wsCloseCallback = function (e) {
            util.log("dashboard-geolocator node " + node.name + " closed WebSocket");
            util.log("dashboard-geolocator closed reason " + e);
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
            //util.log("dashboard-geolocator wsServerRetryActive: " + wsServerRetryActive);
            //util.log("dashboard-geolocator node.notRestart: " + node.notRestart);
            if (wsServerRetryActive === 'yes' && !node.notRestart) {
                util.log("dashboard-geolocator node " + node.name + " will try to reconnect to WebSocket in " + parseInt(wsServerRetryTime) + "s");
                if (!node.intervalID) {
                    node.intervalID = setInterval(node.wsInit, parseInt(wsServerRetryTime) * 1000);
                }
            }
            node.notRestart = false;
        };

        node.wsErrorCallback = function (e) {
            util.log("dashboard-geolocator node " + node.name + " got WebSocket error: " + e);
        };

        node.deleteEmitter = function () {
            util.log("Deleting emitter via webSocket for dashboard-geolocator node " + node.name);
            var newMsg = {
                msgType: "DelEmitter",
                nodeId: node.id,
                user: node.username,
                appId: uid,
                flowId: node.z,
                flowName: node.flowName,
                accessToken: s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid)
            };

            try {
                node.ws.send(JSON.stringify(newMsg));
            } catch (e) {
                util.log("Error deleting emitter via webSocket for dashboard-geolocator node " + node.name + ": " + e);
            }
        };

        node.wsHeartbeatCallback = function () {

        };



        //Lasciarlo, altrimenti va in timeout!!! https://nodered.org/docs/creating-nodes/node-js#closing-the-node
        node.closedDoneCallback = function () {
            util.log("dashboard-geolocator node " + node.name + " has been closed");
        };

        node.wsInit = function (e) {
            util.log("dashboard-geolocator node " + node.name + " is trying to open WebSocket");
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
                    util.log("dashboard-geolocator node " + node.name + " already open WebSocket");
                }
            } catch (e) {
                util.log("dashboard-geolocator node " + node.name + " could not open WebSocket");
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
            util.log("dashboard-geolocator node " + node.name + " got main exception connecting to WebSocket");
        }

    }

    RED.nodes.registerType("dashboard-geolocator", DashboardGeolocator);

};