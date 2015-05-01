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
exports.each = tool.each;
exports.slice = tool.slice;
exports.calcSlot = calcSlot;

exports.createClient = function(port, host, options) {
  var addressArray;

  if (Array.isArray(port)) {
    addressArray = normalizeNetAddress(port);
    options = host;
  } else if (port && typeof port.port === 'number') {
    addressArray = normalizeNetAddress([port]);
    options = host;
  } else if (typeof port === 'string') {
    addressArray = normalizeNetAddress([port]);
    options = host;
  } else if (typeof port === 'number') {
    if (typeof host !== 'string') {
      options = host;
      host = defaultHost;
    }
    addressArray = normalizeNetAddress([{
      port: port,
      host: host
    }]);
  } else {
    options = port;
    addressArray = normalizeNetAddress([{
      port: defaultPort,
      host: defaultHost
    }]);
  }

  options = options || {};
  options.returnBuffers = !!options.returnBuffers;
  options.authPass = (options.authPass || '') + '';
  options.noDelay = options.noDelay == null ? true : !!options.noDelay;
  options.database = options.database > 0 ? Math.floor(options.database) : 0;
  options.maxAttempts = options.maxAttempts >= 0 ? Math.min(options.maxAttempts, 20) : 10;
  options.retryMaxDelay = options.retryMaxDelay >= 150 ? Math.floor(options.retryMaxDelay) : Infinity;

  var client = new RedisClient(addressArray, options);

  if (options.handleError !== false) {
    client.on('error', function(err) {
      console.error('thunk-redis', err.stack);
    });
  }

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
      return new AliasPromise(function(resolve, reject) {
        thunk(function(err, res) {
          return err == null ? resolve(res) : reject(err);
        });
      });
    };
  });
  return client;
};

function normalizeNetAddress(array) {
  return array.map(function(options) {
    if (typeof options === 'string') return options;
    if (typeof options === 'number') return defaultHost + ':' + options;
    options.host = options.host || defaultHost;
    options.port = options.port || defaultPort;
    return options.host + ':' + options.port;
  });
}
