'use strict';

var net = require('net');
var util = require('util');
var resp = require('respjs');

var tool = require('./tool');
var Queue = require('./queue');

var thunks = require('thunks');
var Thunk = thunks();

exports.sendCommand = sendCommand;
exports.createSockets = createSockets;

function createSockets(redis, optionsArray) {
  tool.each(optionsArray, function(option) {
    createSocket(redis, option, {
      attempts: 1,
      commandQueue: new Queue()
    });
  });
}

function addSocket(redis, redisId) {
  redisId = redisId.split(':');
  return createSocket(redis, {
    host: redisId[0],
    port: +redisId[1]
  }, {
    attempts: 1,
    commandQueue: new Queue()
  });
}

function createSocket(redis, options, socketState) {
  var socket, redisState = redis._redisState;
  if (!options.port || !options.host) socket = net.createConnection(options);
  else {
    var redisId = options.host + ':' + options.port;
    if (redisState.pool[redisId]) return redisState.pool[redisId];
    socket = redisState.pool[redisId] = net.createConnection(options);
  }

  socket.setNoDelay(redisState.options.noDelay);
  socket.setTimeout(redisState.options.timeout);
  socket.setKeepAlive(redisState.options.keepAlive);

  socket.pendingWatcher = null;
  socket.debugMode = redisState.options.debugMode;
  socket.returnBuffers = redisState.options.returnBuffers;
  socket.commandsHighWater = redisState.options.commandsHighWater;

  tool.setPrivate(socket, 'commandQueue', socketState.commandQueue);

  return socket
    .on('connect', function() {
      socket.connected = true;
      socket.redisId = socket.remoteAddress + ':' + socket.remotePort;
      checkConnection(redis, socket);
    })
    .on('data', function(chunk) {
      var reply = socket.pendingWatcher;
      if (socket.debugMode) tool.log({
        socketChunk: chunk,
        address: socket.redisId
      });
      if (!reply) return redis.emit('error', new Error('Unexpected reply: ' + chunk));
      if (!reply.resp) reply.resp = createResp(redis, socket, reply);
      reply.resp.feed(chunk);
    })
    .on('error', function(error) {
      flushToRedis(redis, this, error);
      redis.emit('error', error);
    })
    .on('close', function(hadError) {
      flushToRedis(redis, this, new Error(this.redisId + ' was closed'));
      unmountSocket(redis, socket, hadError, true);
    })
    .on('timeout', function() {
      var error = new Error('The redis connection was timeout');
      redis.emit('timeout');
      if (socketState.attempts <= redisState.options.maxAttempts) {
        flushPending(socket, error);
        unmountSocket(redis, socket, error);

        redis.emit('reconnecting', {
          delay: redisState.options.retryDelay,
          attempts: ++socketState.attempts
        });

        setTimeout(function() {
          createSocket(redis, options, {
            attempts: socketState.attempts,
            commandQueue: socket.commandQueue,
          });
        }, redisState.options.retryDelay);
      } else {
        flushToRedis(redis, socket, error);
        unmountSocket(redis, socket, error, true);
      }
    })
    .on('end', function() {
      flushToRedis(redis, this, new Error(socket.redisId + ' was ended'), true);
      unmountSocket(redis, socket);
    });
}

function checkConnection(redis, socket) {
  var redisState = redis._redisState;
  var _socket = redisState.pool[socket.redisId];
  if (_socket && _socket !== socket) {
    socket.destroy();
    redis.emit('warn', new Error('Create connection repeatedly, drop it: ' + socket.redisId));
    return;
  }

  redisState.pool[socket.redisId] = socket;

  var Thunk = thunks(function(error) {
    redis.emit('error', error);
  });

  Thunk(function(callback) {
    // auth
    if (!redisState.options.authPass) return callback();
    var command = createCommand(redis, ['auth', redisState.options.authPass], function(error, res) {
      if (res && res.toString() === 'OK') return callback();
      callback(new Error('Auth failed: ' + socket.redisId));
    });
    socket.commandQueue.push(command);

  })(function() {
    // check replication and cluster
    return function(callback) {
      var command = createCommand(redis, ['info', 'default'], function(error, res) {
        if (!res) return callback(error);
        res = res.toString();
        redisState.clusterMode = res.indexOf('cluster_enabled:1') > 0;
        socket.redisMaster = res.indexOf('role:master') > 0;
        if (socket.redisMaster && !redisState.slots[-1]) redisState.slots[-1] = socket.redisId;
        callback();
      });
      socket.commandQueue.push(command);
    };

  })(function() {
    // check cluster slots and connect them.
    return redisState.clusterMode && function(callback) {
      var command = createCommand(redis, ['cluster', 'slots'], function(error, res) {
        if (error) return callback(error);
        var netOptions = [];
        tool.each(res, function(info) {
          // [ 5461, 10922, [ '127.0.0.1', 7001 ], [ '127.0.0.1', 7004 ] ]
          var masterId, i = 1, replicaIds = [];

          while (info[++i]) {
            netOptions.push({
              host: info[i][0],
              port: info[i][1]
            });
            replicaIds.push(info[i][0] + ':' + info[i][1]);
          }
          masterId = replicaIds[0];
          if (redisState.pool[masterId]) redisState.pool[masterId].replicaIds = replicaIds.slice(1);

          for (i = info[0]; i <= info[1]; i++) redisState.slots[i] = masterId;
        });
        createSockets(redis, netOptions);
        callback();
      });
      socket.commandQueue.push(command);
    };

  })(function() {
    // check selected database
    if (redisState.clusterMode || !redisState.options.database) return;
    return function(callback) {
      var command = createCommand(redis, ['select', redisState.options.database], function(error, res) {
        if (error) return callback(error);
        redisState.database = redisState.options.database;
        callback();
      });
      socket.commandQueue.push(command);
    };

  })(function() {
    tool.log.call(redisState.options, socket.redisId + ' connected.');
    if (!redisState.slots[-1]) return;
    // default socket connected
    if (!redisState.connected) {
      redisState.connected = true;
      redis.emit('connect');
      dispatchCommands(redis);
    }
    execQueue(redisState, socket);
  });

  execQueue(redisState, socket);
}

function createResp(redis, socket, reply) {
  var redisState = redis._redisState;

  return new resp.Resp({
      returnBuffers: socket.returnBuffers,
      expectResCount: reply.commands.length
    })
    .on('error', function(error) {
      if (socket.debugMode) tool.log({respError: error});
      flushPending(socket, error);
      redis.emit('error', error);
    })
    .on('data', function(data) {
      if (socket.debugMode) tool.log({respData: data});

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
        var redisId, _socket;
        switch (data.type) {
          case 'MOVED':
            redisId = data.message.replace(/.+\s/, '');
            redisState.slots[command.slot] = redisId;
            _socket = addSocket(redis, redisId);
            _socket.commandQueue.push(command);
            execQueue(redisState, _socket);
            break;

          case 'ASK':
            redisId = data.message.replace(/.+\s/, '');
            _socket = addSocket(redis, redisId);
            _socket.commandQueue.push(createCommand(redis, ['asking'], function(error, res) {
              if (error) return command.callback(error);
              _socket.commandQueue.push(command);
              execQueue(redisState, _socket);
            }));
            execQueue(redisState, _socket);
            break;

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
      socket.pendingWatcher = null;
      execQueue(redisState, socket);
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

function execCommands(socket, commandQueue, pendingWatcher) {
  socket.pendingWatcher = pendingWatcher || {commands: new Queue()};
  pendingWatcher = socket.pendingWatcher;
  var count = socket.commandsHighWater;

  while (commandQueue.length && count--) {
    var command = commandQueue.shift();
    if (socket.debugMode) tool.log({socketWrite: command.data.toString()});

    pendingWatcher.commands.push(command);

    while (command.additionalCallbacks--)
      pendingWatcher.commands.push({
        name: command.name,
        callback: noOp
      });

    if (!socket.write(command.data)) break;
  }
}

function sendCommand(redis, command, args, additionalCallbacks) {
  return Thunk.call(redis, function(callback) {
    if (this._redisState.ended) return callback(new Error('The redis client was ended'));
    args = tool.slice(args);
    args.unshift(command);
    dispatchCommands(this, createCommand(redis, args, callback, additionalCallbacks));
  });
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
  if (command && !count) return execQueue(redisState, dispatchCommand(redisState, command).socket);

  var assignedSockets = Object.create(null);
  var matched = null;
  while (commandQueue.length) {
    matched = dispatchCommand(redisState, commandQueue.shift());
    assignedSockets[matched.redisId] = matched.socket;
  }

  if (command) {
    matched = dispatchCommand(redisState, command);
    assignedSockets[matched.redisId] = matched.socket;
  }
  tool.each(assignedSockets, function(socket) {
    execQueue(redisState, socket);
  });
}

function dispatchCommand(redisState, command) {
  var redisId = redisState.slots[command.slot];
  var socket = redisState.pool[redisId];
  if (!socket) throw new Error(redisId + ' is not connected');
  socket.commandQueue.push(command);
  return {socket: socket, redisId: socket.redisId};
}

function execQueue(redisState, socket) {
  if (!socket.connected || !socket.commandQueue.length) return;
  var continuous = redisState.pubSubMode || redisState.monitorMode;
  if (!continuous && socket.pendingWatcher) return;
  execCommands(socket, socket.commandQueue, continuous ? socket.pendingWatcher : {commands: new Queue()});
}

function flushPending(socket, error) {
  if (!socket.pendingWatcher) return;
  var command = socket.pendingWatcher.commands.shift();
  while (command) {
    command.callback(error);
    command = socket.pendingWatcher.commands.shift();
  }
  socket.pendingWatcher = null;
}

function flushToRedis(redis, socket, error) {
  flushPending(socket, error);
  var redisQueue = redis._redisState.commandQueue;
  var command = socket.commandQueue.shift();
  while (command) {
    redisQueue.push(command);
    command = socket.commandQueue.shift();
  }
}

function unmountSocket(redis, socket, hadError, tryEnd) {
  if (!socket.connected) return;
  var redisState = redis._redisState;
  socket.connected = false;
  socket.destroy();
  delete redisState.pool[socket.redisId];
  redis.emit('warn', new Error(hadError || (socket.redisId + ' disconnected')));
  var sockets = Object.keys(redisState.pool);
  if (!sockets.length && tryEnd) return redis.clientEnd(hadError);
  if (redisState.slots[-1] !== socket.redisId) return;
  // reset default socket
  redisState.slots[-1] = null;
  for (var i = 1; i < sockets.length; i++) {
    if (redisState.pool[sockets[i]].redisMaster) {
      redisState.slots[-1] = sockets[i];
      return;
    }
  }
  redisState.slots[-1] = sockets[0];
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
