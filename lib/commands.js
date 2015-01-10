'use strict';

var Thunk = require('thunks')();
var tool = require('./tool');
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
  'zremrangebyscore', 'zrevrange', 'zrevrangebyscore', 'zrevrank', 'zscore', 'zunionstore', 'zscan',
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

exports.initCommands = function(proto) {

  proto.clientCommands = commands;

  tool.each(commands, function(command) {
    proto[command] = function() {
      return sendCommand(this, command, adjustArgs(arguments));
    };
  }, null, true);

  /* overrides */

  // Parse the reply from INFO into a hash.
  proto.info = function() {
    return sendCommand(this, 'info', adjustArgs(arguments))(formatInfo);
  };

  // Set the client's password property to the given value on AUTH.
  proto.auth = function(password) {
    return sendCommand(this, 'auth', [password])(function(error, reply) {
      if (reply !== 'OK') error = error || new Error('Auth failed: ' + reply);
      if (error) throw error;
      return reply;
    });
  };

  // Set the client's database property to the database number on SELECT.
  proto.select = function(database) {
    return sendCommand(this, 'select', [database])(function(error, reply) {
      if (reply !== 'OK') error = error || new Error('Select ' + database + ' failed: ' + reply);
      if (error) throw error;
      this._redisState.database = database;
      return reply;
    });
  };

  // Optionally accept a hash as the only argument to MSET.
  proto.mset = function(hash) {
    return sendCommand(this, 'mset', typeof hash === 'object' && !Array.isArray(hash) ? toArray(hash, []) : adjustArgs(arguments));
  };

  // Optionally accept a hash as the only argument to MSETNX.
  proto.msetnx = function(hash) {
    return sendCommand(this, 'msetnx', typeof hash === 'object' && !Array.isArray(hash) ? toArray(hash, []) : adjustArgs(arguments));
  };

  // Optionally accept a hash as the first argument to HMSET after the key.
  proto.hmset = function(key, hash) {
    return sendCommand(this, 'hmset', typeof hash === 'object' ? toArray(hash, [key]) : adjustArgs(arguments));
  };

  // Make a hash from the result of HGETALL.
  proto.hgetall = function() {
    return sendCommand(this, 'hgetall', adjustArgs(arguments))(toHash);
  };

  proto.pubsub = function() {
    var args = adjustArgs(arguments);
    return sendCommand(this, 'pubsub', args)(function(error, res) {
      if (error) throw error;
      if (args[0].toLowerCase() === 'numsub') res = toHash(null, res);
      return res;
    });
  };

  proto.quit = function() {
    return sendCommand(this, 'quit', [])(function(error, res) {
      if (error) throw error;
      this.clientEnd();
      return res;
    });
  };

  tool.each(['psubscribe', 'punsubscribe', 'subscribe', 'unsubscribe'], function(command) {
    proto[command] = function() {
      var args = adjustArgs(arguments);
      return sendCommand(this, command, args, args.length ? (args.length - 1) : 0);
    };
  }, null, true);

  tool.each(commands, function(command) {
    proto[command.toUpperCase()] = proto[command];
  }, null, true);
};

function adjustArgs(args) {
  return Array.isArray(args[0]) ? args[0] : args;
}

function toArray(hash, array) {
  tool.each(hash, function(value, key) {
    array.push(key, value);
  }, null);
  return array;
}

function formatInfo(error, info) {
  if (error) throw error;
  var hash = {};

  tool.each(info.split('\r\n'), function(line) {
    var index = line.indexOf(':');

    if (index === -1) return;
    var name = line.slice(0, index);
    hash[name] = line.slice(index + 1);
  }, null, true);

  return hash;
}

function toHash(error, array) {
  if (error) throw error;
  var hash = {};

  for (var i = 0, len = array.length; i < len; i += 2)
    hash[array[i]] = array[i + 1];

  return hash;
}
