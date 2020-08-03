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

    function SynopticWrite(config) {
        var io = require('socket.io-client');
        var util = require('util');
        var s4cUtility = require("./snap4city-utility.js");
        RED.nodes.createNode(this, config);
        var node = this;
        node.uid = s4cUtility.retrieveAppID(RED);
        node.socketIOUrl = (RED.settings.socketIOUrl ? RED.settings.socketIOUrl : "https://www.snap4city.org");
        node.socketIOPath = (RED.settings.socketIOPath ? RED.settings.socketIOPath : "/synoptics/socket.io");
        node.selectedSynopticId = config.selectedSynopticId;
        node.synopticId = config.synopticId;
        node.selectedSynopticVariableId = config.selectedSynopticVariableId;
        node.synopticVariableId = config.synopticVariableId;
        node.notRestart = false;
        node.socket = null;

        node.on('input', function (msg) {
            if (typeof msg.payload.value != "undefined") {
                node.currentValue = msg.payload.value;
                node.synopticId = (msg.payload.synopticId ? msg.payload.synopticId : node.synopticId);
                node.synopticVariableId = (msg.payload.synopticVariableId ? msg.payload.synopticVariableId : node.synopticVariableId);
                if (node.authenticated && node.displayed && typeof node.synopticId != "undefined" && node.synopticId != "") {
                    node.socket.emit("write", JSON.stringify({
                        id: node.synopticVariableId,
                        value: node.currentValue
                    }));
                } else {
                    var accessToken = "";
                    accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, node.uid);
                    if (accessToken != "" && accessToken != "undefined") {
                        node.socket.emit("authenticate", accessToken);
                    } else {
                        node.error("Check the authentication in the configuration tab");
                    }
                }
            } else {
                node.error("The value must be sent within the value field");
            }
        });


        node.socket = io(node.socketIOUrl, {
            path: node.socketIOPath
        })

        node.startTimestamp = new Date().getTime();
        node.socket.connect();

        node.socket.on('authenticate', function (_data) {
            try {
                _data = JSON.parse(_data);
            } catch (e) {
                //util.log("Problem Parsing data " + _data);

            }

            if (typeof _data.status != "undefined") {
                if (_data.status.toLowerCase() == "ok") {
                    node.status({
                        fill: "green",
                        shape: "dot",
                        text: "Authenticated to the server!"
                    });
                    if (typeof node.synopticId != "undefined" && node.synopticId != "") {
                        node.authenticated = true;
                        node.socket.emit("display", node.synopticId);
                    } else {
                        node.error("You have to configure or input the id of the Synoptic to be read");
                    }
                } else {
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Authentication Problem!"
                    });
                    node.authenticated = false;
                    node.error(_data.error);
                }
            }
        });

        node.socket.on('display', function (_data) {
                //util.log("synoptic-write node " + node.name + " receive display data: " + _data);
                try {
                    _data = JSON.parse(_data);
                } catch (e) {
                    //util.log("Problem Parsing data " + _data);
                }

                if (typeof _data.status != "undefined") {
                    if (_data.status.toLowerCase() == "ok") {
                        node.status({
                            fill: "green",
                            shape: "dot",
                            text: "Display Variables!"
                        });
                        if (typeof node.synopticVariableId != "undefined" && node.synopticVariableId != "") {
                            node.displayed = true;
                            node.socket.emit("write", JSON.stringify({
                                id: node.synopticVariableId,
                                value: node.currentValue
                            }));
                        } else {
                            node.error("You have to configure or input the id of the Synoptic Variable to be read");
                        }
                    } else {
                        node.status({
                            fill: "red",
                            shape: "dot",
                            text: "Display Problem!"
                        });
                        if (_data.error == "unauthorized") {
                            node.authenticated = false;
                        }
                        node.displayed = false;
                        var accessToken = "";
                        accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, node.uid);
                        if (accessToken != "" && accessToken != "undefined") {
                            node.socket.emit("authenticate", accessToken);
                        } else {
                            node.error("Check the authentication in the configuration tab");
                        }

                        node.error(_data.error);
                    }
                }
            }

        )

        node.socket.on('write', function (_data) {
            //util.log("synoptic-write node " + node.name + " writed data: " + _data);
            try {
                _data = JSON.parse(_data);
            } catch (e) {
                //util.log("Problem Parsing data " + _data);

            }

            if (typeof _data.status != "undefined") {
                if (_data.status.toLowerCase() != "error") {
                    node.status({
                        fill: "green",
                        shape: "dot",
                        text: "Value Written!"
                    });

                } else {
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error, see debug tab"
                    });
                    if (_data.error == "unauthorized") {
                        node.authenticated = false;
                    }
                    var accessToken = "";
                    accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, node.uid);
                    if (accessToken != "" && accessToken != "undefined") {
                        node.socket.emit("authenticate", accessToken);
                    } else {
                        node.error("Check the authentication in the configuration tab");
                    }
                    node.error(_data.error);
                }
            }
        });

        node.socket.on('connect', function () {
            //util.log("synoptic-write node " + node.name + " connect");
            node.status({
                fill: "green",
                shape: "dot",
                text: "Connected to the server!"
            });

        });
        node.socket.on('connect_error', (error) => {
            //util.log("synoptic-write node " + node.name + " connect_error: " + error);
            node.status({
                fill: "red",
                shape: "dot",
                text: "Sorry, there seems to be an issue"
            });
            node.authenticated = false;
            node.displayed = false;
        });

        node.socket.on('error', (error) => {
            //util.log("synoptic-write node " + node.name + "error: " + error);
            node.authenticated = false;
            node.displayed = false;
        });

        node.socket.on('reconnect_attempt', () => {
            //util.log("synoptic-write node " + node.name + " reconnect_attempt");
        });

        node.socket.on('disconnect', function (reason) {
            //util.log("synoptic-write node " + node.name + " disconnect: " + reason);
            node.status({
                fill: "red",
                shape: "dot",
                text: "Disconnetted"
            });
            node.startTimestamp = new Date().getTime();
            if (reason === 'io server disconnect') {
                // the disconnection was initiated by the server, you need to reconnect manually
                node.authenticated = false;
                node.displayed = false;
                node.socket.connect();
            }

        });

        node.on('close', function (removed, closedDoneCallback) {

            if (removed) {
                // Cancellazione nodo
                //util.log("synoptic-write node " + node.name + " is being removed from flow");
            } else {
                // Riavvio nodo
                //util.log("synoptic-write node " + node.name + " is being rebooted");
            }
            node.notRestart = true;
            node.socket.close();
            closedDoneCallback();
        });

        node.closedDoneCallback = function () {
            //util.log("synoptic-write node " + node.name + " has been closed");
        };

    }

    RED.nodes.registerType("synoptic-write", SynopticWrite);


    RED.httpAdmin.get('/dashboardSmartCityUrl', function (req, res) {
        var dashboardSmartCityUrl = (RED.settings.dashboardSmartCityUrl ? RED.settings.dashboardSmartCityUrl : "https://www.snap4city.org/dashboardSmartCity/");
        res.send({
            "dashboardSmartCityUrl": dashboardSmartCityUrl
        });
    });

    RED.httpAdmin.get('/synopticList', RED.auth.needsPermission('synoptic-write.read'), function (req, res) {
        var s4cUtility = require("./snap4city-utility.js");
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttp = new XMLHttpRequest();
        var dashboardSmartCityUrl = (RED.settings.dashboardSmartCityUrl ? RED.settings.dashboardSmartCityUrl : "https://www.snap4city.org/dashboardSmartCity/");
        var accessToken = s4cUtility.retrieveAccessToken(RED, null, null, null);
        if (accessToken != "" && dashboardSmartCityUrl != "") {
            console.log(encodeURI(dashboardSmartCityUrl + "api/synoptics.php?accessToken=" + accessToken));
            xmlHttp.open("GET", encodeURI(dashboardSmartCityUrl + "api/synoptics.php?accessToken=" + accessToken), true); // false for synchronous request
            xmlHttp.onload = function (e) {
                if (xmlHttp.readyState === 4) {
                    if (xmlHttp.status === 200) {
                        if (xmlHttp.responseText != "") {
                            try {
                                var response = JSON.parse(xmlHttp.responseText);
                                res.send({
                                    "synopticList": response
                                });
                            }  catch (e) {
                                res.status(500).send({"error": "Parsing Error of the list"});
                            }
                        } else {
                            console.log("Empty Response Text");
                            res.status(500).send({"error": "Empty Response Text"});
                        }
                    } else {
                        console.error(xmlHttp.statusText);
                        res.status(xmlHttp.status).send({"error": "The status returned from the service that provide the list"});
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
}