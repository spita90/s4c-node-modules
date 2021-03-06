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

    function NewDeviceFromModel(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function (msg) {
            var s4cUtility = require("./snap4city-utility.js");
            var uid = s4cUtility.retrieveAppID(RED);
            var inPayload = msg.payload;

            var latitude = (msg.payload.latitude ? msg.payload.latitude : config.latitude);
            var longitude = (msg.payload.longitude ? msg.payload.longitude : config.longitude);
            var k1 = (msg.payload.k1 ? msg.payload.k1 : config.k1);
            var k2 = (msg.payload.k2 ? msg.payload.k2 : config.k2);
            var devicename = (msg.payload.devicename ? msg.payload.devicename : config.devicename);
            var model = (msg.payload.model ? msg.payload.model : config.model);
            node.selectedModel = config.selectedModel;
            var accessToken = "";
            accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid);



            if (accessToken != "" && typeof accessToken != "undefined") {
                var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
                var xmlHttp = new XMLHttpRequest();
                var xmlHttp2 = new XMLHttpRequest();

                var uri = (RED.settings.iotDirectoryUrl ? RED.settings.iotDirectoryUrl : "https://iotdirectory.snap4city.org/");
                console.log(encodeURI(uri + "api/model.php?action=get_model&username=" + s4cUtility.retrieveCurrentUser(RED, node, config.authentication) + "&name=" + model + "&nodered=yes"));
                xmlHttp.open("POST", encodeURI(uri + "api/model.php?action=get_model&username=" + s4cUtility.retrieveCurrentUser(RED, node, config.authentication) + "&name=" + model + "&nodered=yes&token=" + accessToken), true);

                xmlHttp.setRequestHeader("Content-Type", "application/json");
                xmlHttp.setRequestHeader("Authorization", "Bearer " + accessToken);

                xmlHttp.onload = function (e) {
                    if (xmlHttp.readyState === 4) {
                        if (xmlHttp.status === 200) {
                            if (xmlHttp.responseText != "") {
                                try {
                                    var responseJs = JSON.parse(xmlHttp.responseText);
                                    if (responseJs.content.subnature === null) {
                                        responseJs.content.subnature = "";
                                    }
                                    if (responseJs.content.static_attributes === null) {
                                        responseJs.content.static_attributes = "[]";
                                    }

                                    var uri2 = (RED.settings.iotDirectoryUrl ? RED.settings.iotDirectoryUrl : "https://iotdirectory.snap4city.org/" + "api/device.php?action=insert&username=" + s4cUtility.retrieveCurrentUser(RED, node, config.authentication) + "&id=" + encodeURIComponent(devicename) + "&type=" + encodeURIComponent(responseJs.content.devicetype) + "&kind=" + encodeURIComponent(responseJs.content.kind) + "&contextbroker=" + encodeURIComponent(responseJs.content.contextbroker) + "&organization=" + encodeURIComponent(responseJs.content.organization) + "&protocol=" + encodeURIComponent(responseJs.content.protocol) + "&format=" + encodeURIComponent(responseJs.content.format) + "&mac=&model=" + encodeURIComponent(model) + "&producer=" + encodeURIComponent(responseJs.content.producer) + "&latitude=" + latitude + "&longitude=" + longitude + "&visibility=" + encodeURIComponent(responseJs.content.visibility) + "&frequency=" + encodeURIComponent(responseJs.content.frequency) + "&token=" + accessToken + "&k1=" + k1 + "&k2=" + k2 + "&edgegateway_type=&edgegateway_uri=&subnature=" + encodeURIComponent(responseJs.content.subnature) + "&static_attributes=" + encodeURIComponent(responseJs.content.static_attributes) + "&service=" + encodeURIComponent(responseJs.content.service) + "&servicePath=" + encodeURIComponent(responseJs.content.servicePath) + "&nodered=yes&attributes=" + encodeURIComponent(responseJs.content.attributes));
                                    xmlHttp2.open("POST", uri2, true);
                                    xmlHttp2.setRequestHeader("Content-Type", "application/json");
                                    xmlHttp2.setRequestHeader("Authorization", "Bearer " + accessToken);
                                    xmlHttp2.onload = function (e) {
                                        if (xmlHttp2.readyState === 4) {
                                            if (xmlHttp2.status === 200) {
                                                if (xmlHttp2.responseText != "") {
                                                    try {
                                                        msg.payload = JSON.parse(xmlHttp2.responseText);
                                                        if (msg.payload.status == "ok") {
                                                            msg.payload.k1 = k1;
                                                            msg.payload.k2 = k2;
                                                        } else {
                                                            msg.payload.k1 = "";
                                                            msg.payload.k2 = "";
                                                        }

                                                    } catch (e) {
                                                        msg.payload = xmlHttp2.responseText;
                                                        msg.payload.k1 = "";
                                                        msg.payload.k2 = "";
                                                    }
                                                } else {
                                                    msg.payload = JSON.parse("{\"status\": \"There was some problem\"}");
                                                }
                                                s4cUtility.eventLog(RED, inPayload, msg, config, "Node-Red", "IOTDirectory", uri2, "TX");
                                                node.send(msg);
                                            } else {
                                                console.error(xmlHttp2.statusText);
                                                node.error(xmlHttp2.responseText);
                                            }
                                        }
                                    };
                                    xmlHttp2.onerror = function (e) {
                                        console.error(xmlHttp2.statusText);
                                        node.error(xmlHttp2.responseText);
                                    };
                                    try {
                                        xmlHttp2.send();
                                    } catch (e) {
                                        console.log(e);
                                    }
                                } catch (e) {
                                    msg.payload = xmlHttp2.responseText;
                                }
                            } else {
                                msg.payload = JSON.parse("{\"status\": \"There was some problem\"}");
                            }
                            s4cUtility.eventLog(RED, inPayload, msg, config, "Node-Red", "IOTDirectory", uri, "TX");
                            node.send(msg);

                        } else {
                            console.error(xmlHttp2.statusText);
                            node.error(xmlHttp2.responseText);
                        }
                    }
                };

                xmlHttp.onerror = function (e) {
                    console.error(xmlHttp2.statusText);
                    node.error(xmlHttp2.responseText);
                };



                try {
                    xmlHttp.send();


                } catch (e) {
                    console.log(e);
                }
            }
        });
    }
    RED.nodes.registerType("iotdirectory-new-device-from-model", NewDeviceFromModel);


    RED.httpAdmin.get('/iotDirectoryUrl', function (req, res) {
        var iotDirectoryUrl = (RED.settings.iotDirectoryUrl ? RED.settings.iotDirectoryUrl : "https://iotdirectory.snap4city.org/");
        res.send({
            "iotDirectoryUrl": iotDirectoryUrl
        });
    });


    RED.httpAdmin.get('/myModelDataList', RED.auth.needsPermission('iotdirectory-new-device-from-model.read'), function (req, res) {
        var s4cUtility = require("./snap4city-utility.js");
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttp = new XMLHttpRequest();
        var iotDirectoryUrl = (RED.settings.iotDirectoryUrl ? RED.settings.iotDirectoryUrl : "https://iotdirectory.snap4city.org/");
        var accessToken = s4cUtility.retrieveAccessToken(RED, null, null, null);

        if (accessToken != "" && iotDirectoryUrl != "") {
            console.log(iotDirectoryUrl + "api/model.php?action=get_all_models_simple&nodered=yes&token=");
            xmlHttp.open("GET", encodeURI(iotDirectoryUrl + "api/model.php?action=get_all_models_simple&nodered=yes&token=" + accessToken), true); // false for synchronous request
            xmlHttp.onload = function (e) {
                if (xmlHttp.readyState === 4) {
                    if (xmlHttp.status === 200) {
                        if (xmlHttp.responseText != "") {
                            try {
                                var response = JSON.parse(xmlHttp.responseText);
                                console.log(response)
                                res.send({
                                    "modelDataList": response
                                });
                            } catch (e) {
                                res.send("");
                            }
                        }
                    } else {
                        console.error(xmlHttp.statusText);
                    }
                }
            };
            xmlHttp.onerror = function (e) {
                console.error(xmlHttp.statusText);
            };
            xmlHttp.send(null);
        }
    });

    RED.httpAdmin.get('/s4c/js/*', function (req, res) {
        var options = {
            root: __dirname + '/lib/js/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.get('/s4c/css/*', function (req, res) {
        var options = {
            root: __dirname + '/lib/css/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.get('/s4c/json/*', function (req, res) {
        var options = {
            root: __dirname + '/lib/json/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.get('/s4c/img/*', function (req, res) {
        var options = {
            root: __dirname + '/lib/img/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.get('/getkeys', function (req, res) {
        const {
            v4: uuidv4
        } = require('uuid');
        var k1 = uuidv4();
        var k2 = uuidv4();
        res.send({
            "k1": k1,
            "k2": k2
        });
    });

}