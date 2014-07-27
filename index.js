/*!
 * thunk-redis - index.js
 *
 * MIT Licensed
 */

'use strict';

var RedisClient = require('./lib/client'),
  tool = require('./lib/tool'),
  defaultPort = 6379,
  defaultHost = '127.0.0.1';

exports.createClient = function (port, host, options) {
  var  netOptions;

  port = port || defaultPort;

  if (typeof port === 'number') {
    netOptions = {port: port, host: host || defaultHost};
  } else {
    netOptions = {path: port};
  }

  options = options || {};
  if (options.noDelay == null) options.noDelay = true;
  if (options.keepAlive == null) options.keepAlive = true;
  options.timeout = +options.timeout || 0;
  options.maxAttempts = +options.maxAttempts || 0;
  options.commandQueueHighWater = +options.commandQueueHighWater || 1000;
  options.commandQueueLowWater = +options.commandQueueLowWater || 0;
  options.authPass = options.authPass || '';
  options.database = +options.database || 0;

  return new RedisClient(netOptions, options);
};

exports.log = tool.log;

