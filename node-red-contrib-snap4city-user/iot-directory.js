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



    var RED2 = require.main.require('node-red');

    var datamap = {};


    /* function myLabel(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        
    }
 RED.nodes.registerType("label",myLabel);*/

    function IotDirectoryNodeIn(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        // Get the current global flow
        node.on('input', function (msg) {
            jsdom
            node.send(msg);
        });
    }
    RED.nodes.registerType("iot-directory-in", IotDirectoryNodeIn);

    function IotDirectoryNodeOut(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        // Get the current global flow
        node.on('input', function (msg) {
            node.send(msg);
        });
    }
    RED.nodes.registerType("iot-directory-out", IotDirectoryNodeOut);


    RED.httpAdmin.get("/get-id", RED.auth.needsPermission('iot-directory-in.read'), function (req, res) {
        //console.log(req);
        console.log(req.query);

        var ids = [];
        var n = parseInt(req.query.n);


        for (i = 0; i < n; i++) {
            ids.push(RED2.util.generateId());
        }

        //ids.splice(3,1);
        res.send({
            "ids": ids
        });


    });

    RED.httpAdmin.get("/deviceregistration/:id", RED.auth.needsPermission('iot-directory-in.read'), function (req, res) {
        var s4cUtility = require("./snap4city-utility.js");
        res.json({
            "accessToken": s4cUtility.retrieveAccessToken(RED, null, null, null)
        });
    });

    RED.httpAdmin.get("/retrieveAccessTokenLocal/", RED.auth.needsPermission('iot-directory-in.read'), function (req, res) {
        var s4cUtility = require("./snap4city-utility.js");
        res.json({
            "accessToken": s4cUtility.retrieveAccessToken(RED, null, null, null)
        });
    });

    RED.httpAdmin.get("/retrieveUsernameAndRole/", RED.auth.needsPermission('iot-directory-in.read'), function (req, res) {
        username = "";
        user_roles = [];
        role = "manager";

        var url = (RED.settings.keycloakBaseUri ? RED.settings.keycloakBaseUri : "https://www.snap4city.org/auth/realms/master/") + "/protocol/openid-connect/userinfo/";
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", encodeURI(url), false);
        xmlHttp.setRequestHeader("Accept", "application/json");
        xmlHttp.setRequestHeader("Authorization", "Bearer " + req.query.accessToken);
        xmlHttp.send();
        if (xmlHttp.responseText != "") {
            try {
                response = JSON.parse(xmlHttp.responseText);
            } catch (e) {
                console.log(e)
            }
        }
        if (response != "") {
            if (response.preferred_username != "" && response.preferred_username != undefined && response.preferred_username != "undefined")
                username = response.preferred_username;
            else
                username = response.username;
            user_roles = response.roles;
            for (var i = 0; i < user_roles.length; i++) {
                if (user_roles[i].toLowerCase() == "rootadmin" ||
                    user_roles[i].toLowerCase() == "tooladmin" ||
                    user_roles[i].toLowerCase() == "areamanager") {
                    role = user_roles[i];
                    break;
                }
            }

            res.json({
                "username": username,
                "role": role
            });
        }
    });

    RED.httpAdmin.get('/s4c/js/*', function (req, res) {
        var options = {
            root: __dirname + '/lib/js/',
            //	root: 'http://159.149.129.184/s4c/js/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.get('/s4c/css/*', function (req, res) {
        var options = {
            root: __dirname + '/lib/css/',
            // root: 'http://159.149.129.184/s4c/css/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.get('/s4c/json/*', function (req, res) {
        var options = {
            root: __dirname + '/lib/json/',
            // root: 'http://159.149.129.184/s4c/json/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });

    RED.httpAdmin.get('/s4c/img/*', function (req, res) {
        var options = {
            root: __dirname + '/lib/img/',
            // root: 'http://159.149.129.184/s4c/img/',
            dotfiles: 'deny'
        };

        res.sendFile(req.params[0], options);
    });


    RED.httpAdmin.get("/get-datamap", RED.auth.needsPermission('iot-directory-in.read'), function (req, res) {
        //console.log(req.query);
        var latitude = parseFloat(req.query.lat_map);
        var longitude = parseFloat(req.query.long_map);
        var maxDists = parseFloat(req.query.rad_map);
        var uri = "http://www.disit.org/ServiceMap/api/v1/";
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttpSensor = new XMLHttpRequest();
        var xmlHttpActuator = new XMLHttpRequest();

        // xmlHttp.open("GET", encodeURI(uri + "?selection=" + latitude + ";" + longitude + "&categories=" + categories + "&maxResults=" + maxResults + "&maxDists=" + maxDists + "&format=json" + "&lang=" + language + "&geometry=true"), false); // false for synchronous request
        xmlHttpSensor.open("GET", encodeURI(uri + "?selection=" + latitude + ";" + longitude + "&categories=IoTSensor" + "&maxDists=" + maxDists), false); // false for synchronous request
        console.log(uri + "?selection=" + latitude + ";" + longitude + "&categories=IoTSensor" + "&maxDists=" + maxDists);
        xmlHttpSensor.send(null);

        if (xmlHttpSensor.responseText != "") {
            var responseSensor = JSON.parse(xmlHttpSensor.responseText);
            var array_sensors = [];

            var totalmsg_sensor = (responseSensor.Services.features.length);
            for (var i = 0; i < totalmsg_sensor; i++) {
                var responseSensor_sing = responseSensor.Services.features[i];
                var responseSensor_sing_URI = responseSensor_sing["properties"];
                array_sensors.push(responseSensor_sing_URI["serviceUri"].split("/").pop());
            };
            //console.log(array_sensors);

            xmlHttpActuator.open("GET", encodeURI(uri + "?selection=" + latitude + ";" + longitude + "&categories=IoTActuator" + "&maxDists=" + maxDists), false); // false for synchronous request
            console.log(uri + "?selection=" + latitude + ";" + longitude + "&categories=IoTActuator" + "&maxDists=" + maxDists);
            xmlHttpActuator.send(null)

        };
        if (xmlHttpActuator.responseText != "") {
            var responseActuator = JSON.parse(xmlHttpActuator.responseText);
            var array_actuators = [];

            var totalmsg_actuator = (responseActuator.Services.features.length);
            for (var j = 0; j < totalmsg_actuator; j++) {
                var responseActuator_sing = responseActuator.Services.features[j];
                var responseActuator_sing_URI = responseActuator_sing["properties"];
                array_actuators.push(responseActuator_sing_URI["serviceUri"].split("/").pop());
            };
            //console.log(array_actuators);



        };
        var array_sensors_actuators = [];
        array_sensors_actuators = array_sensors.concat(array_actuators);
        res.send(array_sensors_actuators);


    });

    RED.httpAdmin.get("/get-datamap-out", RED.auth.needsPermission('iot-directory-in.read'), function (req, res) {
        //console.log(req.query);
        var latitude = parseFloat(req.query.lat_map);
        var longitude = parseFloat(req.query.long_map);
        var maxDists = parseFloat(req.query.rad_map);
        var uri = "http://www.disit.org/ServiceMap/api/v1/";
        var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
        var xmlHttpSensor = new XMLHttpRequest();
        var xmlHttpActuator = new XMLHttpRequest();

        // xmlHttp.open("GET", encodeURI(uri + "?selection=" + latitude + ";" + longitude + "&categories=" + categories + "&maxResults=" + maxResults + "&maxDists=" + maxDists + "&format=json" + "&lang=" + language + "&geometry=true"), false); // false for synchronous request
        xmlHttpSensor.open("GET", encodeURI(uri + "?selection=" + latitude + ";" + longitude + "&categories=IoTSensor" + "&maxDists=" + maxDists), false); // false for synchronous request
        console.log(uri + "?selection=" + latitude + ";" + longitude + "&categories=IoTSensor" + "&maxDists=" + maxDists);
        xmlHttpSensor.send(null);


        if (xmlHttpSensor.responseText != "") {
            var responseSensor = JSON.parse(xmlHttpSensor.responseText);
            var array_sensors = [];

            var totalmsg_sensor = (responseSensor.Services.features.length);
            for (var i = 0; i < totalmsg_sensor; i++) {
                var responseSensor_sing = responseSensor.Services.features[i];
                var responseSensor_sing_URI = responseSensor_sing["properties"];
                array_sensors.push(responseSensor_sing_URI["serviceUri"].split("/").pop());
            };
            //console.log(array_sensors);

            xmlHttpActuator.open("GET", encodeURI(uri + "?selection=" + latitude + ";" + longitude + "&categories=IoTActuator" + "&maxDists=" + maxDists), false); // false for synchronous request
            console.log(uri + "?selection=" + latitude + ";" + longitude + "&categories=IoTActuator" + "&maxDists=" + maxDists);
            xmlHttpActuator.send(null)

        };
        if (xmlHttpActuator.responseText != "") {
            var responseActuator = JSON.parse(xmlHttpActuator.responseText);
            var array_actuators = [];

            var totalmsg_actuator = (responseActuator.Services.features.length);
            for (var j = 0; j < totalmsg_actuator; j++) {
                var responseActuator_sing = responseActuator.Services.features[j];
                var responseActuator_sing_URI = responseActuator_sing["properties"];
                array_actuators.push(responseActuator_sing_URI["serviceUri"].split("/").pop());
            };
            //console.log(array_actuators);



        };
        var array_sensors_actuators = [];
        array_sensors_actuators = array_sensors.concat(array_actuators);
        res.send(array_sensors_actuators);


    });



    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////
    //          iot-directory-link-in
    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////
    ////////////////////////////////////////////////////


    function IotDirectoryLinkInNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        var event = "node:" + n.id;
        var handler = function (msg) {
            msg._event = n.event;
            node.receive(msg);
        }
        RED.events.on(event, handler);
        this.on("input", function (msg) {
            this.send(msg);
        });
        this.on("close", function () {
            RED.events.removeListener(event, handler);
        });
    }

    RED.nodes.registerType("iot-directory-link-in", IotDirectoryLinkInNode);

    function IotDirectoryLinkOutNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        var event = "node:" + n.id;
        this.on("input", function (msg) {
            msg._event = event;
            RED.events.emit(event, msg)
            this.send(msg);
        });
    }
    RED.nodes.registerType("iot-directory-link-out", IotDirectoryLinkOutNode);




}