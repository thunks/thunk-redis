'use strict';

var net = require('net');
var util = require('util');
var resp = require('respjs');

var tool = require('./tool');
var Queue = require('./queue');

var thunks = require('thunks');
var Thunk = thunks();

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

function createConnection(redis, id, checkNodes) {
  var redisState = redis._redisState;
  var connection = redisState.pool[id];
  if (!connection) connection = redisState.pool[id] = new Connection(redis, id);
  else if (checkNodes) {
    updateClusterNodes(connection)();
    execQueue(connection);
  }
  return connection;
}

function Connection(redis, id) {
  var options = redis._redisState.options;

  this.id = id;
  this.redis = redis;

  this.attempts = 0;
  this.retryDelay = 150;
  this.isMaster = false;
  this.connected = false;
  this.queue = new Queue();
  this.pendingWatcher = null;
  this.replicationIds = null;
  this.debugMode = options.debugMode;
  this.returnBuffers = options.returnBuffers;
  this.commandsHighWater = options.commandsHighWater;

  createSocket(this);
}

Connection.prototype.returnCommands = function() {
  rescuePending(this);
  this.queue.migrateTo(this.redis._redisState.commandQueue);
  return this;
};

function createSocket(connection) {

  connection.connected = false;
  if (connection.socket) connection.socket.destroy();

  var address = connection.id.split(':');
  var options = connection.redis._redisState.options;
  var socket = connection.socket = net.createConnection({
    host: address[0],
    port: +address[1]
  });

  socket.setNoDelay(options.noDelay);
  socket.setTimeout(options.timeout);
  socket.setKeepAlive(options.keepAlive);

  socket
    .on('connect', function() {
      connection.connected = true;
      checkConnection(connection);
    })
    .on('data', function(chunk) {
      var reply = connection.pendingWatcher;
      if (connection.debugMode) tool.log({
        address: connection.id,
        socketChunk: chunk
      });

      if (!reply) return connection.redis.emit('error', new Error('Unexpected reply: ' + chunk));
      if (!reply.resp) reply.resp = createResp(connection);
      reply.resp.feed(chunk);
    })
    .on('error', function(error) {
      connection.returnCommands();
      connection.redis.emit('error', error);
    })
    .on('close', function(hadError) {
      reconnecting(connection, hadError || new Error(connection.id + ' was closed'));
    })
    .on('timeout', function() {
      reconnecting(connection, new Error('The redis connection was timeout'));
    })
    .on('end', function() {
      removeConnection(connection, null, true);
    });
}

function reconnecting(connection, error) {
  var options = connection.redis._redisState.options;
  if (connection.redis._redisState.ended || !connection.connected) return;
  if (connection.attempts <= options.maxAttempts) {
    rescuePending(connection);
    connection.redis.emit('reconnecting', {
      delay: connection.retryDelay,
      attempts: ++connection.attempts
    });

    connection.retryDelay += 1.5;
    if (connection.retryDelay >= options.retryMaxDelay)
      connection.retryDelay = options.retryMaxDelay;

    setTimeout(function() {
      createSocket(connection);
    }, connection.retryDelay);
  } else {
    removeConnection(connection, error, true);
  }
}

function checkConnection(connection) {
  var redisState = connection.redis._redisState;
  var options = redisState.options;
  var Thunk = thunks(function(error) {
    connection.redis.emit('error', error);
  });

  Thunk(function(callback) {
    // auth
    if (!options.authPass) return callback();
    var command = createCommand(connection.redis, ['auth', options.authPass], function(error, res) {
      if (res && res.toString() === 'OK') return callback();
      callback(new Error('Auth failed: ' + connection.id));
    });
    connection.queue.push(command);

  })(function() {
    // check replication and cluster
    return function(callback) {
      var command = createCommand(connection.redis, ['info', 'default'], function(error, res) {
        if (!res) return callback(error);
        res = res.toString();
        redisState.clusterMode = res.indexOf('cluster_enabled:1') > 0;
        connection.isMaster = res.indexOf('role:master') > 0;
        if (connection.isMaster && !redisState.slots[-1]) redisState.slots[-1] = connection.id;
        callback();
      });
      connection.queue.push(command);
    };

  })(function() {
    // read cluster-node-timeout
    return redisState.clusterMode && connection.isMaster && function(callback) {
      var command = createCommand(connection.redis, ['config', 'get', 'cluster-node-timeout'], function(error, res) {
        if (!res) return callback(error);
        if (res[1] > redisState.clusterNodeTimeout) redisState.clusterNodeTimeout = +res[1];
        callback();
      });
      connection.queue.push(command);
    };

  })(function() {
    // check cluster slots and connect them.
    return redisState.clusterMode && connection.isMaster && updateClusterNodes(connection);

  })(function() {
    // check selected database
    if (redisState.clusterMode || !options.database) return;
    return function(callback) {
      var command = createCommand(connection.redis, ['select', options.database], function(error, res) {
        if (error) return callback(error);
        redisState.database = options.database;
        callback();
      });
      connection.queue.push(command);
    };

  })(function() {
    tool.log.call(options, connection.id + ' connected.');
    if (!redisState.slots[-1]) return;
    // default socket connected
    if (!redisState.connected) {
      redisState.connected = true;
      connection.redis.emit('connect');
      dispatchCommands(connection.redis);
    } else execQueue(connection);
  });

  execQueue(connection);
}

function createResp(connection) {
  var redis = connection.redis;
  var redisState = redis._redisState;
  var reply = connection.pendingWatcher;

  return new resp.Resp({
      returnBuffers: connection.returnBuffers,
      expectResCount: reply.commands.length
    })
    .on('error', function(error) {
      if (connection.debugMode) tool.log({respError: error});
      rescuePending(connection);
      redis.emit('error', error);
    })
    .on('data', function(data) {
      if (connection.debugMode) tool.log({respData: data});

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
        var id, _connection;
        switch (data.type) {
          case 'MOVED':
            id = data.message.replace(/.+\s/, '');
            redisState.slots[command.slot] = id;
            _connection = createConnection(redis, id, true);
            _connection.queue.push(command);
            execQueue(_connection);
            break;

          case 'ASK':
            id = data.message.replace(/.+\s/, '');
            _connection = createConnection(redis, id, true);
            _connection.queue.push(createCommand(redis, ['asking'], function(error, res) {
              if (error) return command.callback(error);
              _connection.queue.push(command);
              execQueue(_connection);
            }));
            execQueue(_connection);
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
      connection.pendingWatcher = null;
      execQueue(connection);
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
  if (command && !count) return execQueue(dispatchCommand(redisState, command));

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
    execQueue(connection);
  });
}

function dispatchCommand(redisState, command) {
  var id = redisState.slots[command.slot];
  var connection = redisState.pool[id] || redisState.pool[redisState.slots[-1]];
  if (!connection) throw new Error(id + ' is not connected');
  connection.queue.push(command);
  return connection;
}

function execQueue(connection) {
  var redisState = connection.redis._redisState;
  if (!connection.connected || !connection.queue.length) return;
  var continuous = redisState.pubSubMode || redisState.monitorMode;
  if (!continuous && connection.pendingWatcher) return;
  execCommands(connection, continuous ? connection.pendingWatcher : {commands: new Queue()});
}

function execCommands(connection, pendingWatcher) {
  connection.pendingWatcher = pendingWatcher || {commands: new Queue()};
  pendingWatcher = connection.pendingWatcher;
  var count = connection.commandsHighWater;

  while (connection.queue.length && count--) {
    var command = connection.queue.shift();
    if (connection.debugMode) tool.log({socketWrite: command.data.toString()});

    pendingWatcher.commands.push(command);

    while (command.additionalCallbacks--)
      pendingWatcher.commands.push({
        name: command.name,
        callback: noOp
      });

    if (!connection.socket.write(command.data)) break;
  }
}

function rescuePending(connection) {
  if (!connection.pendingWatcher) return;
  var command = connection.pendingWatcher.commands.pop();
  while (command) {
    if (command.slot != null) connection.queue.unshift(command);
    command = connection.pendingWatcher.commands.pop();
  }
  connection.pendingWatcher = null;
}

function updateClusterNodes(connection) {
  var redisState = connection.redis._redisState;
  var Thunk = thunks(function(error) {
    connection.redis.emit('error', error);
  });

  return Thunk(function(callback) {

    var command = createCommand(connection.redis, ['cluster', 'slots'], function(error, res) {
      if (error) return callback(error);

      tool.each(res, function(info) {
        // [ 5461, 10922, [ '127.0.0.1', 7001 ], [ '127.0.0.1', 7004 ] ]
        var id, i = 1, replicationIds = [];

        while (info[++i]) {
          id = info[i][0] + ':' + info[i][1];
          replicationIds.push(id);
        }
        // get other nodes.
        var _connection = createConnection(connection.redis, replicationIds[0]);
        _connection.isMaster = true;
        _connection.replicationIds = replicationIds.slice(1);

        for (i = info[0]; i <= info[1]; i++) redisState.slots[i] = replicationIds[0];
      });
      callback();
    });

    connection.queue.push(command);
  });
}

function removeConnection(connection, hadError, tryEnd) {
  if (!connection.connected) return;
  var redisState = connection.redis._redisState;
  connection.connected = false;

  // try reset default socket
  if (redisState.slots[-1] === connection.id) {
    var connectionIds = Object.keys(redisState.pool);
    for (var i = 1; i < connectionIds.length; i++) {
      if (connectionIds[i] !== connection.id && redisState.pool[connectionIds[i]].isMaster) {
        redisState.slots[-1] = connectionIds[i];
        break;
      }
    }
  }

  setTimeout(function() {
    if (!redisState.pool) return;
    connection.returnCommands();
    connection.socket.destroy();
    delete redisState.pool[connection.id];

    connection.redis.emit('warn', new Error(hadError || (connection.id + ' disconnected')));
    if (tryEnd && !Object.keys(redisState.pool).length) return connection.redis.clientEnd(hadError);

    // look for standin connection
    var standin = (connection.replicationIds && connection.replicationIds[0]) || redisState.slots[-1];

    for (var s = 0; s < 16384; s++) {
      if (redisState.slots[s] === connection.id) redisState.slots[s] = standin;
    }

    // create or update connection.
    createConnection(connection.redis, standin, true);

  }, redisState.clusterNodeTimeout * 1.2);

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
