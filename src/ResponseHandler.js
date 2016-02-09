'use strict';

class ResponseHandler {

    constructor () {
    }

    respondWithSuccess (rows, fields, response) {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end(rows);
    }

    respondWithError (error, response) {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end(data);
    }

}

module.exports = ResponseHandler;