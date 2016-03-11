'use strict';
let client = require('./src/client');
let hookConfig = require('./config/datahook');
let DataHook = new client(hookConfig);