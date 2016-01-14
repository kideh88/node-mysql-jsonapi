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
