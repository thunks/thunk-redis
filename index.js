'use strict';
/**
 * thunk-redis - https://github.com/thunks/thunk-redis
 *
 * MIT Licensed
 */

var defaultPort = 6379;
var defaultHost = '127.0.0.1';
var tool = require('./lib/tool');
var calcSlot = require('./lib/slot');
var RedisClient = require('./lib/client');

exports.log = tool.log;
exports.calcSlot = calcSlot;

exports.createClient = function(port, host, options) {
  var netOptions;

  if (typeof port === 'string') {
    netOptions = normalizeNetOptions([port]);
    options = host;
  } else if (Array.isArray(port)) {
    netOptions = normalizeNetOptions(port);
    options = host;
  } else if (typeof port === 'number') {
    if (typeof host !== 'string') {
      options = host;
      host = defaultHost;
    }
    netOptions = normalizeNetOptions([{
      port: port,
      host: host
    }]);
  } else {
    options = port;
    netOptions = normalizeNetOptions([{
      port: defaultPort,
      host: defaultHost
    }]);
  }

  options = options || {};
  options.debugMode = !!options.debugMode;
  options.returnBuffers = !!options.returnBuffers;
  options.authPass = (options.authPass || '') + '';
  options.clusterMode = options.clusterMode !== false;
  options.noDelay = options.noDelay == null ? true : !!options.noDelay;
  options.timeout = options.timeout > 0 ? Math.floor(options.timeout) : 0;
  options.keepAlive = options.keepAlive == null ? true : !!options.keepAlive;
  options.retryDelay = options.retryDelay > 0 ? Math.floor(options.retryDelay) : 5000;
  options.maxAttempts = options.maxAttempts > 0 ? Math.floor(options.maxAttempts) : 5;
  options.database = options.database > 0 ? Math.floor(options.database) : 0;
  options.commandsHighWater = options.commandsHighWater >= 1 ? Math.floor(options.commandsHighWater) : 10000;

  var client = new RedisClient(netOptions, options);
  var AliasPromise = options.usePromise;

  if (!AliasPromise) return client;

  if (typeof AliasPromise !== 'function' && typeof Promise === 'function') AliasPromise = Promise;
  if (!AliasPromise.prototype || typeof AliasPromise.prototype.then !== 'function')
    throw new Error(String(AliasPromise) + ' is not Promise constructor');
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

function normalizeNetOptions(array) {
  return array.map(function(option) {
    switch (typeof option) {
      case 'string':
        return {path: option};
      case 'number':
        return {
          port: option,
          host: defaultHost
        };
      default: return option;
    }
  });
}
