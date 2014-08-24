'use strict';

var JSONkit = require('jsonkit');
var Thunk = require('thunks')();
var slice = require('./tool').slice;
var sendCommand = require('./socket').sendCommand;

// (Redis 2.8) http://redis.io/commands
var commands = [
  // Key
  'del', 'dump', 'exists', 'expire', 'expireat', 'keys', 'migrate', 'move',
  'object', 'persist', 'pexpire', 'pexpireat', 'pttl', 'randomkey', 'rename',
  'renamenx', 'restore', 'sort', 'ttl', 'type', 'scan',
  // String
  'append', 'bitcount', 'bitop', 'decr', 'decrby', 'get', 'getbit', 'getrange',
  'getset', 'incr', 'incrby', 'incrbyfloat', 'mget', 'mset', 'msetnx', 'psetex',
  'set', 'setbit', 'setex', 'setnx', 'setrange', 'strlen',
  // Hash
  'hdel', 'hexists', 'hget', 'hgetall', 'hincrby', 'hincrbyfloat', 'hkeys', 'hlen',
  'hmget', 'hmset', 'hset', 'hsetnx', 'hvals', 'hscan',
  // List
  'blpop', 'brpop', 'brpoplpush', 'lindex', 'linsert', 'llen', 'lpop', 'lpush',
  'lpushx', 'lrange', 'lrem', 'lset', 'ltrim', 'rpop', 'rpoplpush', 'rpush', 'rpushx',
  // Set
  'sadd', 'scard', 'sdiff', 'sdiffstore', 'sinter', 'sinterstore', 'sismember',
  'smembers', 'smove', 'spop', 'srandmember', 'srem', 'sunion', 'sunionstore', 'sscan',
  // Sorted Set
  'zadd', 'zcard', 'zcount', 'zincrby', 'zinterstore', 'zrange', 'zrangebyscore',
  'zrank', 'zrem', 'zremrangebyrank', 'zremrangebyscore', 'zrevrange', 'zrevrangebyscore',
  'zrevrank', 'zscore', 'zunionstore', 'zsan',
  // Pubsub
  'psubscribe', 'publish', 'pubsub', 'punsubscribe', 'subscribe', 'unsubscribe',
  // Transaction
  'discard', 'exec', 'multi', 'unwatch', 'watch',
  // Script
  'eval', 'evalsha', 'script',
  // Connection
  'auth', 'echo', 'ping', 'quit', 'select',
  // Server
  'bgrewriteaof', 'bgsave', 'client', 'config', 'dbsize', 'debug', 'flushall',
  'flushdb', 'info', 'lastsave', 'monitor', 'psync', 'save', 'shutdown', 'slaveof',
  'slowlog', 'sync', 'time'
];

exports.initCommands = function () {
  var proto = this;

  JSONkit.each(commands, function (command) {
    this[command] = function () {
      return sendCommand.call(this, command, slice(arguments));
    };
  }, this, true);

  /* overrides */

  // Parse the reply from INFO into a hash.
  this.info = function (section) {
    return sendCommand.call(this, 'info', slice(arguments))(formatInfo);
  };

  // Set the client's password property to the given value on AUTH.
  this.auth = function (password) {
    return sendCommand.call(this, 'auth', [password])(function (error, reply) {
      if (reply !== 'OK') error = error || new Error('Auth failed: ' + reply);
      if (error) {
        this.emit('error', error);
        throw error;
      }
      return reply;
    });
  };

  // Set the client's database property to the database number on SELECT.
  this.select = function (database) {
    return sendCommand.call(this, 'select', [database])(function (error, reply) {
      if (reply !== 'OK') error = error || new Error('Select ' + database + ' failed: ' + reply);
      if (error) {
        this.emit('error', error);
        throw error;
      }
      this.status.database = database;
      return reply;
    });
  };

  // Set the client's isMonitor property to true on MONITOR.
  this.monitor = function () {
    return sendCommand.call(this, 'monitor')(function (error, reply) {
      this.status.monitorMode = true;
      return reply;
    });
  };

  // Optionally accept a hash as the only argument to MSET.
  this.mset = function (hash) {
    var args = (typeof hash === 'object') ? toArray(hash, []) : slice(arguments);
    return sendCommand.call(this, 'mset', args);
  };

  // Optionally accept a hash as the only argument to MSETNX.
  this.msetnx = function (hash) {
    var args = (typeof hash === 'object') ? toArray(hash, []) : slice(arguments);
    return sendCommand.call(this, 'msetnx', args);
  };

  // Optionally accept a hash as the first argument to HMSET after the key.
  this.hmset = function (key, hash) {
    var args = (typeof hash === 'object') ? toArray(hash, [key]) : slice(arguments);
    return sendCommand.call(this, 'hmset', args);
  };

  // Make a hash from the result of HGETALL.
  this.hgetall = function () {
    return sendCommand.call(this, 'hgetall', slice(arguments))(toHash);
  };
};

function toArray(hash, array) {
  JSONkit.each(hash, function (value, key) {
    array.push(key, value);
  }, null, false);
  return array;
}

function formatInfo(error, info) {
  var hash = {};

  JSONkit.each(info.split('\r\n'), function (line) {
    var index = line.indexOf(':');

    if (index === -1) return;

    var name = line.slice(0, index);
    hash[name] = line.slice(index + 1);
  }, null, true);

  return hash;
}

function toHash(error, array) {
  var hash = {};

  for (var i = 0, len = array.length; i < len; i += 2)
    hash[array[i]] = array[i + 1];

  return hash;
}
