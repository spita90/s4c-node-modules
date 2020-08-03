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

    function SynopticSubscribe(config) {
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

        node.socket = io(node.socketIOUrl, {
            path: node.socketIOPath
        })

        node.startTimestamp = new Date().getTime();
        node.socket.connect();

        node.socket.on('authenticate', function (_data) {
            console.log("authenticate " + _data);
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
                    node.error(_data.error);
                }
            }
        });

        node.socket.on('display', function (_data) {
                //util.log("synoptic-subscribe node " + node.name + " receive display data: " + _data);
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
                            node.socket.emit("subscribe", node.synopticVariableId);
                        } else {
                            node.error("You have to configure or input the id of the Synoptic Variable to be read");
                        }
                    } else {
                        node.status({
                            fill: "red",
                            shape: "dot",
                            text: "Display Problem!"
                        });
                        node.error(_data.error);
                    }
                }
            }

        )

        node.socket.on('subscribe', function (_data) {
            //util.log("synoptic-subscribe node " + node.name + " receive subscribe data: " + _data);
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
                        text: "Subscribed!"
                    });


                } else {
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "Error, see debug tab"
                    });
                    node.error(_data.error);
                }
            }
        })


        node.socket.on('update ' + node.synopticVariableId, function (_data) {
            //util.log("synoptic-subscribe node " + node.name + " receive read data: " + _data);

            try {
                _data = JSON.parse(_data);
            } catch (e) {
                //util.log("Problem Parsing data " + _data);

            }

            if (typeof _data.lastValue != "undefined") {

                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "Update value!"
                });

                node.send({
                    "payload": _data
                });

            } else {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "Error, see debug tab"
                });
                node.error(_data.error);
            }

        });

        node.socket.on('connect', function () {
            //util.log("synoptic-subscribe node " + node.name + ' connect');
            node.status({
                fill: "green",
                shape: "dot",
                text: "Connected to the server!"
            });

            var accessToken = "";
            accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, node.uid);
            if (accessToken != "" && accessToken != "undefined") {
                node.socket.emit("authenticate", accessToken);
            } else {
                node.error("Check the authentication in the configuration tab");
            }

        });
        node.socket.on('connect_error', (error) => {
            //util.log("synoptic-subscribe node " + node.name + " connect_error: " + error);
            node.status({
                fill: "red",
                shape: "dot",
                text: "Sorry, there seems to be an issue"
            });
        });

        node.socket.on('error', (error) => {
            //util.log("synoptic-subscribe node " + node.name + " error: " + error);
        });

        node.socket.on('reconnect_attempt', () => {
            //util.log("synoptic-subscribe node " + node.name + " reconnect_attempt");
        });

        node.socket.on('disconnect', function (reason) {
            //util.log("synoptic-subscribe node " + node.name + " disconnect: " + reason);
            node.status({
                fill: "red",
                shape: "dot",
                text: "Disconnetted"
            });
            node.startTimestamp = new Date().getTime();
            var wsServerRetryActive = (RED.settings.wsServerRetryActive ? RED.settings.wsServerRetryActive : "yes");
            var wsServerRetryTime = (RED.settings.wsServerRetryTime ? RED.settings.wsServerRetryTime : 30);
            if (reason === 'io server disconnect') {
                // the disconnection was initiated by the server, you need to reconnect manually
                node.socket.connect();
            }
            /* else if (wsServerRetryActive === 'yes' && !node.notRestart) {
                           //util.log("synoptic-subscribe node " + node.name + " will try to reconnect to WebSocket in " + parseInt(wsServerRetryTime) + "s");
                           if (!node.intervalID) {
                               node.intervalID = setInterval(node.socket.connect, parseInt(wsServerRetryTime) * 1000);
                           }
                       } */
        });

        node.on('close', function (removed, closedDoneCallback) {

            if (removed) {
                // Cancellazione nodo
                //util.log("synoptic-subscribe node " + node.name + " is being removed from flow");
            } else {
                // Riavvio nodo
                //util.log("synoptic-subscribe node " + node.name + " is being rebooted");
            }
            node.notRestart = true;
            node.socket.close();
            closedDoneCallback();
        });

        node.closedDoneCallback = function () {
            //util.log("synoptic-subscribe node " + node.name + " has been closed");
        };

    }

    RED.nodes.registerType("synoptic-subscribe", SynopticSubscribe);

}