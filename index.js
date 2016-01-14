'use strict';
let http = require('http');
let config = require('./config/config.database');
let Client = require('./src/client');

let DataHook = new Client(config);

http.createServer(function (request, response) {
    DataHook.requestHandler.delegate(request).then(function (data) {
        DataHook.responseHandler.respond(data, response);
    });
}).listen(1337, '127.0.0.1');