'use strict';

var JSONkit = require('jsonkit');
var Thunk = require('thunks')();
var slice = require('./tool').slice;
var sendCommand = require('./socket').sendCommand;

// (Redis 2.8.17) http://redis.io/commands
var commands = [
  // Keys
  'del', 'dump', 'exists', 'expire', 'expireat', 'keys', 'migrate', 'move',
  'object', 'persist', 'pexpire', 'pexpireat', 'pttl', 'randomkey', 'rename',
  'renamenx', 'restore', 'sort', 'ttl', 'type', 'scan',
  // Strings
  'append', 'bitcount', 'bitop', 'bitpos', 'decr', 'decrby', 'get', 'getbit', 'getrange',
  'getset', 'incr', 'incrby', 'incrbyfloat', 'mget', 'mset', 'msetnx', 'psetex',
  'set', 'setbit', 'setex', 'setnx', 'setrange', 'strlen',
  // Hashes
  'hdel', 'hexists', 'hget', 'hgetall', 'hincrby', 'hincrbyfloat', 'hkeys', 'hlen',
  'hmget', 'hmset', 'hset', 'hsetnx', 'hvals', 'hscan',
  // Lists
  'blpop', 'brpop', 'brpoplpush', 'lindex', 'linsert', 'llen', 'lpop', 'lpush',
  'lpushx', 'lrange', 'lrem', 'lset', 'ltrim', 'rpop', 'rpoplpush', 'rpush', 'rpushx',
  // Sets
  'sadd', 'scard', 'sdiff', 'sdiffstore', 'sinter', 'sinterstore', 'sismember',
  'smembers', 'smove', 'spop', 'srandmember', 'srem', 'sunion', 'sunionstore', 'sscan',
  // Sorted Sets
  'zadd', 'zcard', 'zcount', 'zincrby', 'zinterstore', 'zlexcount', 'zrange', 'zrangebylex',
  'zrevrangebylex', 'zrangebyscore', 'zrank', 'zrem', 'zremrangebylex', 'zremrangebyrank',
  'zremrangebyscore', 'zrevrange', 'zrevrangebyscore', 'zrevrank', 'zscore', 'zunionstore', 'zsan',
  // HyperLog
  'pfadd', 'pfcount', 'pfmerge',
  // Pub/Sub
  'psubscribe', 'publish', 'pubsub', 'punsubscribe', 'subscribe', 'unsubscribe',
  // Transaction
  'discard', 'exec', 'multi', 'unwatch', 'watch',
  // Scripting
  'eval', 'evalsha', 'script',
  // Connection
  'auth', 'echo', 'ping', 'quit', 'select',
  // Server
  'bgrewriteaof', 'bgsave', 'client', 'cluster', 'command', 'config', 'dbsize', 'debug', 'flushall',
  'flushdb', 'info', 'lastsave', 'monitor', 'role', 'save', 'shutdown', 'slaveof',
  'slowlog', 'sync', 'time'
];

exports.initCommands = function (ctx) {

  JSONkit.each(commands, function (command) {
    this[command] = function () {
      return sendCommand(this, command, slice(arguments));
    };
  }, ctx, true);

  /* overrides */

  // Parse the reply from INFO into a hash.
  ctx.info = function (section) {
    return sendCommand(this, 'info', slice(arguments))(formatInfo);
  };

  // Set the client's password property to the given value on AUTH.
  ctx.auth = function (password) {
    return sendCommand(this, 'auth', [password])(function (error, reply) {
      if (reply !== 'OK') error = error || new Error('Auth failed: ' + reply);
      if (error) return Thunk.digest(error);
      return reply;
    });
  };

  // Set the client's database property to the database number on SELECT.
  ctx.select = function (database) {
    return sendCommand(this, 'select', [database])(function (error, reply) {
      if (reply !== 'OK') error = error || new Error('Select ' + database + ' failed: ' + reply);
      if (error) return Thunk.digest(error);
      this._redisState.database = database;
      return reply;
    });
  };

  // Set the client's isMonitor property to true on MONITOR.
  ctx.monitor = function () {
    return sendCommand(this, 'monitor')(function (error, reply) {
      this._redisState.monitorMode = true;
      return reply;
    });
  };

  // Optionally accept a hash as the only argument to MSET.
  ctx.mset = function (hash) {
    var args = (typeof hash === 'object') ? toArray(hash, []) : slice(arguments);
    return sendCommand(this, 'mset', args);
  };

  // Optionally accept a hash as the only argument to MSETNX.
  ctx.msetnx = function (hash) {
    var args = (typeof hash === 'object') ? toArray(hash, []) : slice(arguments);
    return sendCommand(this, 'msetnx', args);
  };

  // Optionally accept a hash as the first argument to HMSET after the key.
  ctx.hmset = function (key, hash) {
    var args = (typeof hash === 'object') ? toArray(hash, [key]) : slice(arguments);
    return sendCommand(this, 'hmset', args);
  };

  // Make a hash from the result of HGETALL.
  ctx.hgetall = function () {
    return sendCommand(this, 'hgetall', slice(arguments))(toHash);
  };

  ctx.hscan = function () {
    return sendCommand(this, 'hscan', slice(arguments))(function (error, res) {
      if (res) res[1] = toHash(null, res[1]);
      return Thunk.digest(error, res);
    });
  };

  ctx.quit = function () {
    return sendCommand(this, 'quit')(function (error, res) {
      if (error) return Thunk.digest(error);
      this.end();
      return res;
    });
  };
};

function toArray(hash, array) {
  JSONkit.each(hash, function (value, key) {
    array.push(key, value);
  }, null);
  return array;
}

function formatInfo(error, info) {
  if (error) return Thunk.digest(error);
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
  if (error) return Thunk.digest(error);
  var hash = {};

  for (var i = 0, len = array.length; i < len; i += 2)
    hash[array[i]] = array[i + 1];

  return hash;
}
