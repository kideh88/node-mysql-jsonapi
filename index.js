'use strict';
let http = require('http');
let config = require('./config/config.datahook');
let Client = require('./src/client');

let DataHook = new Client(config);

http.createServer(function (request, response) {
	DataHook.requestHandler.run(request).then(
		function (rows, fields) {
			console.log(rows);
			DataHook.responseHandler.respondWithSuccess(rows, fields, response);
		},
		function (error) {
			DataHook.responseHandler.respondWithError(error, response);
		}
	);
}).listen(1337, '127.0.0.1');