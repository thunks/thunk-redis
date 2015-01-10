/*!
 * thunk-redis - index.js
 *
 * MIT Licensed
 */

'use strict';

var RedisClient = require('./lib/client');
var tool = require('./lib/tool');
var defaultPort = 6379;
var defaultHost = 'localhost';

exports.createClient = function(port, host, options) {
  var netOptions;

  if (typeof port === 'string') {
    netOptions = {
      path: port
    };
    options = host;
  } else {
    netOptions = {
      port: port || defaultPort,
      host: host || defaultHost
    };
    if (typeof port !== 'number') {
      netOptions.port = defaultPort;
      options = port;
    } else if (typeof host !== 'string') {
      netOptions.host = defaultHost;
      options = host;
    }
  }

  options = options || {};
  options.noDelay = options.noDelay == null ? true : !!options.noDelay;
  options.keepAlive = options.keepAlive == null ? true : !!options.keepAlive;
  options.timeout = options.timeout > 0 ? Math.floor(options.timeout) : 0;
  options.retryDelay = options.retryDelay > 0 ? Math.floor(options.retryDelay) : 5000;
  options.maxAttempts = options.maxAttempts > 0 ? Math.floor(options.maxAttempts) : 5;
  options.commandsHighWater = options.commandsHighWater >= 1 ? Math.floor(options.commandsHighWater) : 10000;
  options.database = options.database > 0 ? Math.floor(options.database) : 0;
  options.authPass = (options.authPass || '') + '';
  options.returnBuffers = !!options.returnBuffers;

  return new RedisClient(netOptions, options);
};

exports.log = tool.log;
