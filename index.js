/*!
 * thunk-redis - index.js
 *
 * MIT Licensed
 */

/*global require exports */
'use strict';

var net = require('net'),
  RedisClient = require('./lib/client'),
  connectionId = 0,
  defaultPort = 6379,
  defaultHost = '127.0.0.1';

exports.createClient = function (port, host, options) {
  var  netOptions, redisClient, netStream;

  options = options || {};
  port = port || defaultPort;
  host = host || defaultHost;

  if (typeof port === 'number') {
    netOptions = {port: port, host: host};
  } else {
    netOptions = {path: port};
  }

  netStream = net.createConnection(netOptions);
  redisClient = new RedisClient(netStream, options);
  redisClient.connection = netOptions;

  return redisClient;
};


