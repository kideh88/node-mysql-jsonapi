'use strict';

class ResponseHandler {

    constructor() {
    }

    respond(data, response) {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end(data);
    }

}

module.exports = ResponseHandler;