'use strict';

var net = require('net');
var util = require('util');
var resp = require('respjs');

var tool = require('./tool');
var Queue = require('./queue');

var Thunk = require('thunks')();

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
  else {
    process.nextTick(function() {
      connection.execQueue();
    });
  }
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
  this.pendingWatcher = null;
  this.replicationIds = null;
  this.debugMode = options.debugMode;
  this.returnBuffers = options.returnBuffers;
  this.commandsHighWater = options.commandsHighWater;

  this.connect();
}

Connection.prototype.returnCommands = function() {
  this.rescuePending();
  this.queue.migrateTo(this.redis._redisState.commandQueue);
  return this;
};

Connection.prototype.rescuePending = function() {
  if (!this.pendingWatcher) return;
  var command = this.pendingWatcher.commands.pop();
  while (command) {
    if (command.slot != null && command.name !== 'debug') this.queue.unshift(command);
    command = this.pendingWatcher.commands.pop();
  }
  this.pendingWatcher = null;
  return this;
};

Connection.prototype.destroy = function() {
  if (this.ended) return;
  this.ended = true;
  this.connected = false;
  this.returnCommands();
  this.socket.end();
  this.socket.destroy();
  this.socket = null;
};

Connection.prototype.connect = function() {
  var ctx = this;

  this.connected = false;
  if (this.socket) this.socket.destroy();

  var address = this.id.split(':');
  var options = this.redis._redisState.options;
  var socket = this.socket = net.createConnection({
    host: address[0],
    port: +address[1]
  });

  socket.setNoDelay(options.noDelay);
  socket.setTimeout(options.timeout);
  socket.setKeepAlive(options.keepAlive);

  socket
    .on('connect', function() {
      // reset
      ctx.attempts = 0;
      ctx.retryDelay = 1000;

      ctx.connected = true;
      ctx.checkConnection();
    })
    .on('data', function(chunk) {
      var reply = ctx.pendingWatcher;
      if (ctx.debugMode) tool.log({
        node: ctx.id,
        socketChunk: chunk
      });

      if (!reply) return ctx.redis.emit('error', new Error('Unexpected reply: ' + chunk));
      if (!reply.resp) reply.resp = ctx.createResp();
      reply.resp.feed(chunk);
    })
    .on('error', function(error) {
      ctx.redis.emit('error', error);
    })
    .on('close', function(hadError) {
      ctx.reconnecting();
    })
    .on('timeout', function() {
      ctx.reconnecting(new Error('The redis connection was timeout'));
    })
    .on('end', function() {
      if (!ctx.redis._redisState.clusterMode) ctx.tryRemove(null, true);
    });
  return this;
};

Connection.prototype.reconnecting = function(error) {
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
  if (redisState.slots[-1] !== this.id)
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
      ctx.connect();
      ctx.redis.emit('reconnecting', {
        delay: ctx.retryDelay,
        attempts: ctx.attempts
      });
    }, this.retryDelay);
  } else {
    this.tryRemove(error || new Error(this.id + ' reconnecting failed'), true);
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
    ctx.queue.push(command);

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
      ctx.queue.push(command);
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
      ctx.queue.push(command);
    };

  })(function() {
    tool.log.call(options, ctx.id + ' connected.');
    // default socket connected
    if (redisState.connected) ctx.execQueue();
    else {
      redisState.connected = true;
      ctx.redis.emit('connect');
      dispatchCommands(ctx.redis);
    }
  });

  this.execQueue();
};

Connection.prototype.createResp = function() {
  var ctx = this;
  var redis = this.redis;
  var redisState = redis._redisState;
  var reply = this.pendingWatcher;

  return new resp.Resp({
      returnBuffers: ctx.returnBuffers,
      expectResCount: reply.commands.length
    })
    .on('error', function(error) {
      if (ctx.debugMode) tool.log({respError: error});
      ctx.rescuePending();
      redis.emit('error', error);
    })
    .on('data', function(data) {
      if (ctx.debugMode) tool.log({
        node: ctx.id,
        respData: data
      });

      var command = reply.commands.first();
      if (redisState.monitorMode && (!command || command.name !== 'quit'))
        return redis.emit('monitor', data);

      if (isMessageReply(data)) return redis.emit.apply(redis, data);

      if (isUnSubReply(data)) {
        if (redisState.pubSubMode && !data[2]) {
          redisState.pubSubMode = false;
          if (command) this.setAutoEnd(reply.commands.length);
        }

        if (!command) this.end();
        else if (data[0] === command.name) {
          reply.commands.shift();
          command.callback();
        }

        return redis.emit.apply(redis, data);
      }

      reply.commands.shift();
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
            break;

          case 'ASK':
            id = data.message.replace(/.+\s/, '');
            _connection = createConnection(redis, id);
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
        redisState.monitorMode = true;
        this.setAutoEnd();
        return command.callback(null, data);
      }

      if (isSubReply(data)) {
        // (pub)subscribe can generate many replies. All are emitted as events.
        if (!redisState.pubSubMode) {
          redisState.pubSubMode = true;
          this.setAutoEnd();
        }
        command.callback();
        return redis.emit.apply(redis, data);
      }

      return command.callback(null, data);
    })
    .on('end', function() {
      ctx.pendingWatcher = null;
      ctx.execQueue();
    });
};

Connection.prototype.tryRemove = function(error, tryEnd) {
  var redisState = this.redis._redisState;
  if (this.ended || !redisState.pool) return;

  this.destroy();
  delete redisState.pool[this.id];
  var connectionIds = Object.keys(redisState.pool);
  // try reset default socket
  if (redisState.slots[-1] === this.id) redisState.slots[-1] = connectionIds[0];
  // dispatch commands again
  dispatchCommands(this.redis);

  if (error) this.redis.emit('error', error);
  if (tryEnd && !connectionIds.length) return this.redis.clientEnd(error);
};

Connection.prototype.execQueue = function() {
  if (!this.connected || !this.queue.length) return;

  var redisState = this.redis._redisState;
  var continuous = redisState.pubSubMode || redisState.monitorMode;
  if (!continuous && this.pendingWatcher) return;

  this.pendingWatcher = continuous ? this.pendingWatcher : {commands: new Queue()};
  var pendingWatcher = this.pendingWatcher = this.pendingWatcher || {commands: new Queue()};
  var count = this.commandsHighWater;

  while (this.queue.length && count--) {
    var command = this.queue.shift();
    if (this.debugMode) tool.log({
      node: this.id,
      slot: command.slot,
      socketWrite: command.data.toString()
    });

    pendingWatcher.commands.push(command);
    var additionalCallbacks = command.additionalCallbacks;
    while (additionalCallbacks-- > 0)
      pendingWatcher.commands.push({
        name: command.name,
        callback: noOp
      });

    if (!this.socket.write(command.data)) break;
  }
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

    connection.queue.push(command);
  });
}

// This Command constructor is ever so slightly faster than using an object literal, but more importantly, using
// a named constructor helps it show up meaningfully in the V8 CPU profiler and in heap snapshots.
function Command(command, slot, data, callback, additionalCallbacks) {
  this.slot = slot;
  this.data = data;
  this.name = command;
  this.callback = callback;
  this.additionalCallbacks = additionalCallbacks || 0;
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

  var count = commandQueue.length;

  if (!command && !count) return;
  if (command && !count) return dispatchCommand(redisState, command).execQueue();

  var assignedConnections = Object.create(null);
  var connection = null;
  while (commandQueue.length) {
    connection = dispatchCommand(redisState, commandQueue.shift());
    assignedConnections[connection.id] = connection;
  }

  if (command) {
    connection = dispatchCommand(redisState, command);
    assignedConnections[connection.id] = connection;
  }
  tool.each(assignedConnections, function(connection) {
    connection.execQueue();
  });
}

function dispatchCommand(redisState, command) {
  var id = redisState.slots[command.slot];
  var connection = redisState.pool[id] || redisState.pool[redisState.slots[-1]];
  if (!connection) throw new Error(id + ' is not connected');
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
