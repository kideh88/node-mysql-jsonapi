'use strict';

class ResponseHandler {

    constructor () {
    }

    respondWithSuccess (rows, fields, response) {
        response.writeHead(200, { 'Content-Type': 'application/vnd.api+json' });
        response.end(rows);
    }

    respondWithError (error, response) {
        // Wrong content type requests need to state correct accept header?
        //"accept": 'application/vnd.api+json'
        response.writeHead(200, { 'Content-Type': 'application/vnd.api+json' });
        response.end(data);
    }

}

module.exports = ResponseHandler;