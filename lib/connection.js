'use strict';

var net = require('net');
var util = require('util');
var resp = require('respjs');

var tool = require('./tool');
var Queue = require('./queue');

var Thunk = require('thunks')();
var debugResp = require('debug')('redis:resp');
var debugSocket = require('debug')('redis:socket');
var debugCommand = require('debug')('redis:command');


exports.sendCommand = sendCommand;
exports.createConnections = createConnections;

function sendCommand(redis, command, args, additionalCallbacks, responseHook) {
  return Thunk.call(redis, function(callback) {
    if (this._redisState.ended) return callback(new Error('The redis client was ended'));
    args = tool.slice(args);
    args.unshift(command);
    var _callback = !responseHook ? callback : function(err, res) {
      if (err != null) return callback(err);
      callback(null, responseHook.call(redis, res));
    };
    dispatchCommands(this, createCommand(this, args, _callback, additionalCallbacks));
  });
}

function createConnections(redis, addressArray) {
  addressArray.forEach(function(id) {
    createConnection(redis, id);
  });
}

function createConnection(redis, id) {
  var redisState = redis._redisState;
  var connection = redisState.pool[id];
  if (!connection) connection = redisState.pool[id] = new Connection(redis, id);
  return connection;
}

function Connection(redis, id) {
  var options = redis._redisState.options;

  this.id = id;
  this.redis = redis;

  this.attempts = 0;
  this.retryDelay = 1000;

  this.ended = false;
  this.connected = false;
  this.queue = new Queue();
  this.pendingQueue = new Queue();
  this.replicationIds = null;
  this.returnBuffers = options.returnBuffers;
  this.connect();
}

Connection.prototype.returnCommands = function() {
  debugCommand('move commands to main queue, %s', this.id);
  this.rescuePending();
  this.queue.migrateTo(this.redis._redisState.commandQueue);
  return this;
};

Connection.prototype.rescuePending = function() {
  if (!this.pendingQueue) return;
  debugCommand('rescue pending commands, %s', this.id);
  while (this.pendingQueue.length) {
    var command = this.pendingQueue.pop();
    if (command.slot != null && command.name !== 'debug') this.queue.unshift(command);
  }
  this.pendingQueue = null;
  return this;
};

Connection.prototype.disconnect = function() {
  if (this.ended) return;
  this.ended = true;
  this.returnCommands();
  this.destroy();
};

Connection.prototype.destroy = function() {
  this.connected = false;
  this.resp.removeAllListeners();
  this.socket.removeAllListeners(['connect', 'data', 'error', 'close', 'timeout', 'end', 'drain']);
  this.socket.end();
  this.socket.destroy();
  this.socket = null;
  debugSocket('destroy socket, %s', this.id);
};

Connection.prototype.connect = function() {
  var ctx = this;

  this.connected = false;
  if (this.socket) this.destroy();

  var address = this.id.split(':');
  var options = this.redis._redisState.options;
  var socket = this.socket = net.createConnection({
    host: address[0],
    port: +address[1]
  });

  socket.setNoDelay(options.noDelay);
  socket.setTimeout(0);
  socket.setKeepAlive(true);
  debugSocket('create socket, %s', this.id);

  this.resp = ctx.createResp();

  socket
    .once('connect', function() {
      // reset
      ctx.attempts = 0;
      ctx.retryDelay = 1000;

      ctx.checkConnection();
      debugSocket('socket connected, %s', ctx.id);
    })
    .on('data', function(chunk) {
      debugSocket('socket receive, node %s, length %d', ctx.id, chunk.length, '\n', chunk);
      ctx.resp.feed(chunk);
    })
    .on('error', function(error) {
      ctx.redis.emit('error', error);
    })
    .once('close', function(hadError) {
      ctx.reconnecting();
    })
    .once('end', function() {
      if (!ctx.redis._redisState.clusterMode) ctx.tryRemove(null, true);
    });
  return this;
};

Connection.prototype.reconnecting = function() {
  var ctx = this;
  var redisState = this.redis._redisState;
  var options = redisState.options;
  this.connected = false;

  if (redisState.ended || this.ended) return;

  // try reset default socket
  if (redisState.slots[-1] === this.id) {
    for (var id in redisState.pool) {
      if (id !== this.id) {
        redisState.slots[-1] = id;
        break;
      }
    }
  }

  // check newest cluster nodes
  if (redisState.slots[-1] !== this.id && redisState.pool[redisState.slots[-1]])
    updateNodes(redisState.pool[redisState.slots[-1]])(function() {
      ctx.returnCommands();
      dispatchCommands(ctx.redis);
    });

  if (++this.attempts <= options.maxAttempts) {
    this.rescuePending();
    this.retryDelay *= 1.2;
    if (this.retryDelay >= options.retryMaxDelay)
      this.retryDelay = options.retryMaxDelay;

    setTimeout(function() {
      debugSocket('socket reconnecting, %s', ctx.id);
      ctx.connect();
      ctx.redis.emit('reconnecting', {
        delay: ctx.retryDelay,
        attempts: ctx.attempts
      });
    }, this.retryDelay);
  } else {
    this.tryRemove(new Error(this.id + ' reconnecting failed'), true);
  }
};

Connection.prototype.checkConnection = function() {
  var ctx = this;
  var redisState = this.redis._redisState;
  var options = redisState.options;

  redisState.Thunk(function(callback) {
    // auth
    if (!options.authPass) return callback();
    var command = createCommand(ctx.redis, ['auth', options.authPass], function(error, res) {
      if (res && res.toString() === 'OK') return callback();
      callback(new Error('Auth failed: ' + ctx.id));
    });
    ctx.sendCommand(command);

  })(function() {
    // check replication and cluster
    return function(callback) {
      var command = createCommand(ctx.redis, ['info', 'default'], function(error, res) {
        if (!res) return callback(error);
        res = res.toString();
        // remove slave node
        if (res.indexOf('role:master') === -1) return ctx.tryRemove();
        // set default node
        if (!redisState.slots[-1]) redisState.slots[-1] = ctx.id;
        redisState.clusterMode = res.indexOf('cluster_enabled:1') > 0;
        callback();
      });
      ctx.sendCommand(command);
    };

  })(function() {
    // check cluster slots and connect them.
    return updateNodes(ctx);

  })(function() {
    // check selected database
    if (redisState.clusterMode || !options.database) return;
    return function(callback) {
      var command = createCommand(ctx.redis, ['select', options.database], function(error, res) {
        if (error) return callback(error);
        redisState.database = options.database;
        callback();
      });
      ctx.sendCommand(command);
    };

  })(function() {
    ctx.connected = true;
    // default socket connected
    if (redisState.connected) ctx.flushQueue();
    else {
      redisState.connected = true;
      ctx.redis.emit('connect');
      dispatchCommands(ctx.redis);
    }
  });
};

Connection.prototype.createResp = function() {
  var ctx = this;
  var redis = this.redis;
  var redisState = redis._redisState;
  var pendingQueue = this.pendingQueue;

  return new resp.Resp({
      returnBuffers: ctx.returnBuffers,
      expectResCount: 0
    })
    .on('error', function(error) {
      debugResp('resp error, node %s', ctx.id, '\n', error);
      ctx.rescuePending();
      redis.emit('error', error);
    })
    .on('wait', function() {
      ctx.flushQueue();
    })
    .on('data', function(data) {
      debugResp('resp receive, node %s', ctx.id, '\n', data);

      var command = pendingQueue.first();
      if (redisState.monitorMode && (!command || command.name !== 'quit'))
        return redis.emit('monitor', data);

      if (isMessageReply(data)) return redis.emit.apply(redis, data);

      if (isUnSubReply(data)) {
        if (redisState.pubSubMode && !data[2]) {
          redisState.pubSubMode = false;
        }

        if (!command) this.end();
        else if (data[0] === command.name) {
          pendingQueue.shift();
          command.callback();
        }

        return redis.emit.apply(redis, data);
      }

      pendingQueue.shift();
      if (!command) return redis.emit('error', new Error('Unexpected reply: ' + data));

      if (util.isError(data)) {
        data.node = ctx.id;

        var id, _connection;
        switch (data.type) {
          case 'MOVED':
            id = data.message.replace(/.+\s/, '');
            redisState.slots[command.slot] = id;
            _connection = createConnection(redis, id);
            _connection.queue.push(command);
            debugCommand('MOVED command, %s', id, '\n', command);
            break;

          case 'ASK':
            id = data.message.replace(/.+\s/, '');
            _connection = createConnection(redis, id);
            debugCommand('ASK command, %s', id, '\n', command);
            _connection.queue.push(createCommand(redis, ['asking'], function(error, res) {
              if (error) return command.callback(error);
              _connection.queue.push(command);
              _connection.execQueue();
            }));
            break;

          case 'CLUSTERDOWN':
            command.callback(data);
            return redis.emit('error', data);

          default:
            command.callback(data);
        }

        return redis.emit('warn', data);
      }

      if (command.name === 'monitor') {
        debugCommand('enter monitor mode', '\n', command);
        redisState.monitorMode = true;
        return command.callback(null, data);
      }

      if (isSubReply(data)) {
        // (pub)subscribe can generate many replies. All are emitted as events.
        if (!redisState.pubSubMode) {
          redisState.pubSubMode = true;
        }
        command.callback();
        return redis.emit.apply(redis, data);
      }

      return command.callback(null, data);
    });
};

Connection.prototype.tryRemove = function(error, tryEnd) {
  var redis = this.redis;
  var redisState = this.redis._redisState;
  if (this.ended || !redisState.pool) return;

  this.disconnect();
  delete redisState.pool[this.id];
  var connectionIds = Object.keys(redisState.pool);
  // try reset default socket
  if (redisState.slots[-1] === this.id) redisState.slots[-1] = connectionIds[0];

  if (error) redis.emit('error', error);
  if (tryEnd && !connectionIds.length) redis.clientEnd(error);
  else {
    // dispatch commands again
    process.nextTick(function() {
      dispatchCommands(redis);
    });
  }
};

Connection.prototype.flushQueue = function() {
  if (!this.connected || this.pendingQueue.length) return this;
  while (this.queue.length) this.sendCommand(this.queue.shift());

  return this;
};

Connection.prototype.sendCommand = function(command) {
  this.pendingQueue.push(command);
  var additionalCallbacks = command.additionalCallbacks;
  while (additionalCallbacks-- > 0)
    this.pendingQueue.push({
      name: command.name,
      callback: noOp
    });

  debugSocket('socket write, slot %s, node %s, length %d', command.slot, this.id, command.data.length, '\n', command.data);
  return this.socket.write(command.data);
};

function updateNodes(connection) {
  var redis = connection.redis;
  return redis._redisState.Thunk(function(callback) {
    if (!redis._redisState.clusterMode) return callback();
    var command = createCommand(redis, ['cluster', 'slots'], function(error, res) {
      if (error) return callback(error);
      tool.each(res, function(info) {
        // [ 5461, 10922, [ '127.0.0.1', 7001 ], [ '127.0.0.1', 7004 ] ]
        var id, i = 1, replicationIds = [];

        while (info[++i]) {
          id = info[i][0] + ':' + info[i][1];
          replicationIds.push(id);
        }
        // get other nodes.
        var _connection = createConnection(redis, replicationIds[0]);
        _connection.replicationIds = replicationIds.slice(1);

        for (i = info[0]; i <= info[1]; i++) redis._redisState.slots[i] = replicationIds[0];
      });
      callback();
    });

    connection.sendCommand(command);
  });
}

function Command(command, slot, data, callback, additionalCallbacks) {
  this.slot = slot;
  this.data = data;
  this.name = command;
  this.callback = callback;
  this.additionalCallbacks = additionalCallbacks || 0;
  debugCommand('add command', '\n', this);
}

function createCommand(redis, reqArray, callback, additionalCallbacks) {
  var buffer, slot;
  try {
    slot = redis.clientCalcSlot(reqArray);
    buffer = resp.bufferify(reqArray);
  } catch (error) {
    return callback(error);
  }
  return new Command(reqArray[0], slot, buffer, callback, additionalCallbacks);
}

function dispatchCommands(redis, command) {
  var redisState = redis._redisState;
  var commandQueue = redisState.commandQueue;

  if (!redisState.connected) {
    if (command) commandQueue.push(command);
    return;
  }

  var connections = Object.create(null);

  var _connection = null;
  while (commandQueue.length) {
    _connection = dispatchCommand(redisState, commandQueue.shift());
    if (_connection) connections[_connection.id] = _connection;
  }

  if (command) _connection = dispatchCommand(redisState, command);
  if (_connection) connections[_connection.id] = _connection;

  tool.each(connections, function(connection) {
    connection.flushQueue();
  });
}

function dispatchCommand(redisState, command) {
  var id = redisState.slots[command.slot];
  var connection = redisState.pool[id] || redisState.pool[redisState.slots[-1]];

  if (!connection || connection.ended) {
    process.nextTick(function() {
      command.callback(new Error('connection(' + (connection.id || command.slot) + ') not exist'));
    });
    return;
  }
  connection.queue.push(command);
  return connection;
}

var messageTypes = Object.create(null);
messageTypes.message = true;
messageTypes.pmessage = true;

function isMessageReply(reply) {
  return reply && messageTypes[reply[0]];
}

var subReplyTypes = Object.create(null);
subReplyTypes.subscribe = true;
subReplyTypes.psubscribe = true;

function isSubReply(reply) {
  return reply && subReplyTypes[reply[0]];
}

var unSubReplyTypes = Object.create(null);
unSubReplyTypes.unsubscribe = true;
unSubReplyTypes.punsubscribe = true;

function isUnSubReply(reply) {
  return reply && unSubReplyTypes[reply[0]];
}

function noOp() {}
