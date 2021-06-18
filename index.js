'use strict';
global.__basedir = __dirname;

process.env.UV_THREADPOOL_SIZE = 100;

const homeAssistantUrl = "http://myhomeassistant.com";  // process.env.HA_URL
const homeAssistantToken = "xxxxxxxxxxxxxxxxxxxxxxxx";  // process.env.HA_TOKEN
const listeningPort = 9999;                             // process.env.PORT
const checkSeconds = 60;                                // process.env.CHECK_SECONDS
const variance = 10;                                    // process.env.VARIANCE

const logger = require("logger-to-memory");
const api = require("express-simple-api");
const fs = require('fs');

var loggerConfig = {
    "logger-to-memory": {
        "logsEnabled": true,
        "maxLogLines": 100,
        "logToConsole": true,
        "lineSeparator": "<br>"
    }
};
var log = new logger(loggerConfig);

var config = {
    "express-simple-api": {
        "apiHeader": "Power outage detector:",
        "host": '0.0.0.0',
        "port": typeof process.env.PORT === "undefined" ? listeningPort : process.env.PORT
    }
};

var _d = {
    // "lastDateTimeInterval" : Date.now(),
    "checkSeconds" : typeof process.env.CHECK_SECONDS === "undefined" ? checkSeconds : process.env.CHECK_SECONDS,
    "variance" : typeof process.env.VARIANCE === "undefined" ? variance : process.env.VARIANCE,
    "devices" : Array()
};
var _mark = Date.now();

const haUrl = typeof process.env.HA_URL === "undefined" ? homeAssistantToken : process.env.HA_URL;
const haToken = typeof process.env.HA_TOKEN === "undefined" ? homeAssistantToken : process.env.HA_TOKEN;

const dataFile = "data.json";
const markFile = "mark.json";

function isEmptyObject(obj) {
    return !Object.keys(obj).length;
}

function getMark(){
    if (fs.existsSync(markFile)){
        const data = fs.readFileSync(markFile, "utf8");
        if (data.length != 0){
            const readed = JSON.parse(data);
            if (!isEmptyObject(readed)){
                _mark = readed.mark;
            }
        }
    }    
}

function loadData(){
    if (fs.existsSync(dataFile)){
        const data = fs.readFileSync(dataFile, "utf8");
        if (data.length != 0){
            const readed = JSON.parse(data);
            if (!isEmptyObject(readed)){
                _d = readed;
            }
        }
    }    
}

function saveData(){
    fs.writeFileSync(dataFile, JSON.stringify(_d));
}

function setMark(){
    fs.writeFileSync(markFile, '{"mark":'+ _mark +'}');
}

loadData();

function turnOffLight(id){
    var domain = id.substring(0, id.indexOf("."));
    var request = require('sync-request');
    try{
        var res = request('POST', haUrl + '/api/services/' + domain + '/turn_off', {
            headers: {
                'Authorization': 'Bearer ' + haToken
            },
            body: '{"entity_id":"' + id + '"}'
        });
        const ok = res.statusCode == 200;
        if (!ok)
            log.log("Error switching off " + id + " => HTML error code: " + res.statusCode);
        return ok;
    }
        catch (error){
        log.log("Error switching off " + id + " => " + error);
        return false;
    }
    
}

function anyPendingStuff(){
    for(var index = 0; index < _d.devices.length; ++index){
        if (_d.devices[index].true)
            return true;
    }
    return false;
}

function markAllStuffPending(pending){
    for(var index = 0; index < _d.devices.length; ++index){
        _d.devices[index].turnOffPending = pending;
    }
}

function intervalFunction(){
    log.log("Waking up")
    // read mark from disk
    getMark();
    // get current time
    var currentTime = Date.now();
    var timeSinceLastCheck = (currentTime - _mark) / 1000;
    log.log("Seconds since last check: " + timeSinceLastCheck + " => max time = " + _d.checkSeconds);
    if ( timeSinceLastCheck - _d.variance > _d.checkSeconds){
        log.log("Power outage detected!");
        markAllStuffPending(true);
    }

    for(var index = 0; index < _d.devices.length; ++index){
        if (_d.devices[index].turnOffPending){
            if (turnOffLight(_d.devices[index].id)){
                log.log("Device " + _d.devices[index].id + " turned off");
                _d.devices[index].turnOffPending = false;
            } else {
                log.log("Problem turnig off device " + _d.devices[index].id + " => Will try the next time");
            }
        }
    }

    _mark = Date.now();
    setMark();
    log.log("Going to sleep again...");
}

intervalFunction();
var interval = setInterval(intervalFunction, _d.checkSeconds * 1000);

var e = new api(config);
e.setLogger(log);


var jsonPath = {
    "path": "/api/listDevices",
    "description": "List devices to shutdown when power outage is detected",
    "method": "GET",
    "params": [],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, (req, res) => {
    if (typeof _d.devices === "undefined"){
        res.send("No devices found");
    } else {
        res.send(JSON.stringify(_d.devices));
    }
});

jsonPath = {
    "path": "/api/addDevice",
    "description": "Add device that will shutdown when power outage is detected",
    "method": "GET",
    "params": [{
        name: "deviceId",
        type: "string",
        maxLength: 60,
        placeholder: "Device id"
    }],
    "result": {
        "type": "json"
    }
};

function getDeviceIndex(id){
    const found = (device => device.id == id);
    return _d.devices.findIndex(found);

}

function existsDevice(id){
    return getDeviceIndex(id) != -1;
}

function addDevice(id){
    if (!existsDevice(id)){
        _d.devices.push({
            "id" : id,
            "turnOffPending" : false
        });
        return true;
    } else
        return false;
}


e.addPath(jsonPath, (req, res) => {
    if (typeof req.query.deviceId === "undefined"){
        res.send("No device specified");
    } else {
        if (addDevice(req.query.deviceId)){
            saveData();
            res.send(JSON.stringify(_d.devices));
        } else {
            res.send("There was a problem adding device " + req.query.deviceId);
        }
    }
});

jsonPath = {
    "path": "/api/addDeviceList",
    "description": "Add device list that will shutdown when power outage is detected",
    "method": "GET",
    "params": [{
        name: "deviceIds",
        type: "string",
        maxLength: 1024,
        placeholder: "Comma separated devices id"
    }],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    if (typeof req.query.deviceIds === "undefined"){
        res.send("No device specified");
    } else {
        var deviceIds = req.query.deviceIds.split(",");
        for(var index = 0; index < deviceIds.length; ++index){
            addDevice(deviceIds[index].trim());
        }
        saveData();
        res.send(JSON.stringify(_d.devices));
    }
});


jsonPath = {
    "path": "/api/removeDevice",
    "description": "Add device that will shutdown when power outage is detected",
    "method": "GET",
    "params": [{
        name: "deviceId",
        type: "string",
        maxLength: 60,
        placeholder: "Device id"
    }],
    "result": {
        "type": "json"
    }
};

e.addPath(jsonPath, (req, res) => {
    if (typeof req.query.deviceId === "undefined"){
        res.send("No device specified");
    } else {
        const index = getDeviceIndex(req.query.deviceId);
        if (index == -1){
            res.send("Device " + req.query.deviceId + " not found");
        } else {
            _d.devices.splice(index, 1);
            saveData();
            res.send(JSON.stringify(_d.devices));
        }
    }
});

jsonPath = {
    "path": "/",
    "description": "Main endpoint",
    "method": "GET",
    "params": [],
    "result": {
        "type": "json"
    }
};
e.addPath(jsonPath, (req, res) => {
    res.send("<html><body><div align='center'>Something is coming...<br>;-)</div>");
});


e.startListening();
