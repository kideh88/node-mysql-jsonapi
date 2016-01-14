'use strict';

class RequestHandler {

    constructor(Database) {
        this.database = Database;
        //this.queryHelper = QueryHelper;
    }

    delegate(request) {

        //var statement = this.queryHelper.getStatement(request.url);
        var statement = 'SELECT * FROM article';
        //this.queryHelper.getMethod(request.url));
        console.log(request.url);
        return this.database.get(statement);
    }

}

module.exports = RequestHandler;

'use strict';

let RequestHandler = require('./RequestHandler');
let ResponseHandler = require('./ResponseHandler');
let MySqlDatabase = require('./Database');

class DataHook {

    constructor(config) {
        this.connection = new MySqlDatabase(config);
        this.requestHandler = new RequestHandler(this.connection);
        this.responseHandler = new ResponseHandler();
    }

}

module.exports = DataHook;