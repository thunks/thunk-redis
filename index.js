'use strict';
/**
 * thunk-redis - https://github.com/thunks/thunk-redis
 *
 * MIT Licensed
 */

var defaultPort = 6379;
var defaultHost = 'localhost';
var tool = require('./lib/tool');
var RedisClient = require('./lib/client');

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
  options.returnBuffers = !!options.returnBuffers;
  options.authPass = (options.authPass || '') + '';
  options.noDelay = options.noDelay == null ? true : !!options.noDelay;
  options.timeout = options.timeout > 0 ? Math.floor(options.timeout) : 0;
  options.database = options.database > 0 ? Math.floor(options.database) : 0;
  options.keepAlive = options.keepAlive == null ? true : !!options.keepAlive;
  options.retryDelay = options.retryDelay > 0 ? Math.floor(options.retryDelay) : 5000;
  options.maxAttempts = options.maxAttempts > 0 ? Math.floor(options.maxAttempts) : 5;
  options.commandsHighWater = options.commandsHighWater >= 1 ? Math.floor(options.commandsHighWater) : 10000;

  var AliasPromise = options.usePromise;
  var client = new RedisClient(netOptions, options);
  if (AliasPromise && typeof AliasPromise !== 'function')
    AliasPromise = typeof Promise === 'function' ? Promise : false;

  if (!AliasPromise) return client;
  // if `options.usePromise` is available, export promise commands API for a client instance.
  tool.each(client.clientCommands, function(command) {
    var commandMethod = client[command];
    client[command] = client[command.toUpperCase()] = function() {
      var thunk = commandMethod.apply(client, arguments);
      return new AliasPromise(function (resolve, reject) {
        thunk(function(error, res) {
          if (error != null) return reject(error);
          resolve(arguments.length > 2 ? tool.slice(arguments, 1) : res);
        });
      });
    };
  });
  return client;
};

exports.log = tool.log;
