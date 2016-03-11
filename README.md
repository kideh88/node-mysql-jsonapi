# node-mysql-jsonapi
# DataHook

DataHook is a lightweight NodeJs application for JSON-API spec communication.
First implementation will only contain a MySQL connector. Other databases should be easy to implement at later times.

To be used for node projects that make use of [JSON API](http://jsonapi.org/)


## Installation

// NOT NPM PUBLISHED YET
```sh
$ npm install node-mysql-jsonapi
$ npm install datahook
```

## Usage

Require the module 'DataHook' into your application and use the 'parseRequest' function to convert the request.url to an easy
usable requestData object.

```js
'use strict';
let client = require('./src/client');
let hookConfig = require('./config/datahook');
let DataHook = new client(hookConfig);
```

## First time running DataHook

The first time you run DataHook it will scan your database structure to build a model object.
This object contains all the information needed to insert and retrieve data.
JSON-API requires proper aliases for any data relations, these aliases must be manually named in the data.structure.json file.

If you have data that should be restricted fron being read, you need to change their 'is_restricted' value to true.

If you have data that should be retrieved using special SELECT methods or modifiers, they should be written in 'select_modifier'.

## Config data information (./config/datahook)

Lets you configurate datahook in a separate /config/ directory which should be part of .gitignore

```js
const DATA_HOOK = {};

DATA_HOOK.MYSQL = {
  HOST: 'localhost',
  USER: 'myuser',
  PASSWORD: 'mypass',
  DATABASE: 'mydb',
  PORT: 3306
};

DATA_HOOK.NODE = {
  PORT: 1337,
  HOSTNAME: '127.0.0.1',
  MAX_REQUEST_SIZE: 3e6,
  DATA_STRUCTURE_JSON: 'config/data.structure.json',
  JSON_INDENT: 4,
  ALLOWED_METHODS: ['get', 'post', 'patch', 'delete'],
  CONTENT_TYPE: ['application/vnd.api+json']
};

module.exports = DATA_HOOK;
```


## Important

Endpoint whitelisting example"

```js
  // INSERT EXAMPLE
```

## Tests!

Will be added when structure is more solid

