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

    function FullTextSearchDev(config) {
        var s4cUtility = require("./snap4city-utility.js");
        RED.nodes.createNode(this, config);
        var node = this;
        node.on('input', function (msg) {
            var uri = (RED.settings.ascapiUrl ? RED.settings.ascapiUrl : "https://www.disit.org/superservicemap/api/v1") + "/";
            var search = (msg.payload.search ? msg.payload.search : config.search);
            var selection = (msg.payload.selection ? msg.payload.selection : config.selection);
            var maxResults = (msg.payload.maxresults ? msg.payload.maxresults : config.maxresults);
            var maxDists = (msg.payload.maxdistance ? msg.payload.maxdistance : config.maxdists);
            var language = (msg.payload.lang ? msg.payload.lang : config.lang);
            var geometry = (msg.payload.geometry ? msg.payload.geometry : config.geometry);
            var uid = s4cUtility.retrieveAppID(RED);
            var inPayload = msg.payload;
            var accessToken = "";
            accessToken = s4cUtility.retrieveAccessToken(RED, node, config.authentication, uid);
            var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
            var xmlHttp = new XMLHttpRequest();
            console.log(encodeURI(uri + "?search=" + search + "&selection=" + selection + "&maxResults=" + maxResults + "&maxDists=" + maxDists + "&format=json" + "&lang=" + language + "&geometry=" + geometry + (typeof uid != "undefined" && uid != "" ? "&uid=" + uid : "") + "&appID=iotapp"));
            xmlHttp.open("GET", encodeURI(uri + "?search=" + search + "&selection=" + selection + "&maxResults=" + maxResults + "&maxDists=" + maxDists + "&format=json" + "&lang=" + language + "&geometry=" + geometry + (typeof uid != "undefined" && uid != "" ? "&uid=" + uid : "") + "&appID=iotapp"), true); // false for synchronous request
            if (typeof accessToken != "undefined" && accessToken != "") {
                xmlHttp.setRequestHeader('Authorization', 'Bearer ' + accessToken);
            }
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
                        s4cUtility.eventLog(RED, inPayload, msg, config, "Node-Red", "ASCAPI", uri, "RX");
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
        });
    }
    RED.nodes.registerType("full-text-search-dev", FullTextSearchDev);
}