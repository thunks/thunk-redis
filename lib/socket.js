'use strict';

var net = require('net');
var util = require('util');
var Thunk = require('thunks')();
var resp = require('respjs');
var tool = require('./tool');

exports.initSocket = initSocket;
exports.sendCommand = sendCommand;

function initSocket(redis, options, socketState) {
  var waitForAuth = false, waitForSelect = false;
  var socket = redis._socket = net.createConnection(options);

  socket.setNoDelay(redis._options.noDelay);
  socket.setKeepAlive(redis._options.keepAlive);
  socket.setTimeout(redis._options.timeout);

  socket.pendingWaiter = null;
  socket.redisConnected = false;
  socket.commandsHighWater = redis._options.commandsHighWater;
  socket.returnBuffers = redis._options.returnBuffers;
  socket.debugMode = redis._options.debugMode;

  tool.setPrivate(socket, 'commandQueue', socketState.commandQueue);

  function checkReady() {
    if (waitForAuth || waitForSelect) return execQueue(socket, true);
    redis._redisState.connected = socket.redisConnected = true;
    redis.emit('connect');
    execQueue(socket);
  }

  if (redis._options.authPass) {
    waitForAuth = true;
    redis.auth(redis._options.authPass)(function (error) {
      if (error) return socket.emit('error', error);
      waitForAuth = false;
      checkReady();
    });
  }

  if (redis._options.database) {
    waitForSelect = true;
    redis.select(redis._options.database)(function (error) {
      if (error) return socket.emit('error', error);
      waitForSelect = false;
      checkReady();
    });
  }

  socket
    .on('connect', checkReady)
    .on('data', function (chunk) {
      var reply = socket.pendingWaiter;

      if (socket.debugMode) tool.log({socketChunk: chunk.toString()});
      if (!reply.resp) reply.resp = initResp(redis, reply);
      reply.resp.feed(chunk);
    })
    .on('error', function (error) {
      flushAll(socket, error);
      redis.emit('error', error);
    })
    .on('close', function (isException) {
      flushAll(socket, new Error('The redis connection was closed'));
      redis.emit('close');
    })
    .on('timeout', function () {
      var error = new Error('The redis connection was timeout');
      redis.emit('timeout');
      if (socketState.attempts <= redis._options.maxAttempts) {
        flushPending(socket, error);
        socket.removeAllListeners();
        socket.destroy();
        
        redis.emit("reconnecting", {
          delay: redis._options.retryDelay,
          attempts: ++socketState.attempts
        });

        setTimeout(function () {
          initSocket(redis, options, {
            attempts: socketState.attempts,
            commandQueue: socket.commandQueue
          });
        }, redis._options.retryDelay);
      } else {
        flushAll(socket, error);
        redis.end();
      }
    })
    .on('end', function () {
      flushAll(socket, new Error('The redis connection was ended'));
      redis.end();
    })
    .on('queueDrain', function () {
      redis.emit('drain');
    });

}

function initResp(redis, reply) {
  var socket = redis._socket;

  return new resp.Resp({
    expectResCount: reply.commands.length,
    returnBuffers: socket.returnBuffers
  })
  .on('error', function (error) {
    if (socket.debugMode) tool.log({respError: error});
    flushPending(socket, error);
    redis.emit('error', error);
  })
  .on('data', function (data) {
    if (socket.debugMode) tool.log({respData: data});

    if (_isMessageReply(data)) return redis.emit.apply(redis, data);
    if (redis._redisState.monitorMode) return redis.emit('monitor', data);

    var command = reply.commands.shift();
    if (command) {
      if (util.isError(data)) command.callback(data);
      else {
        command.callback(null, data);
        // (pub)subscribe can generate many replies. The first
        // one is returned. All are emitted as events.
        if (_isSubReply(data)) redis.emit.apply(redis, data);
      }
    } else if (_isSubReply(data)) {
      redis.emit.apply(redis, data);
    } else {
      this.emit('error', new Error('Unexpected reply: ' + data));
    }
  })
  .on('end', function () {
    socket.pendingWaiter = null;
    execQueue(socket);
  });
}

function sendCommand(redis, command, args) {
  return Thunk.call(redis, function (callback) {
    if (!Array.isArray(args)) args = [];
    args.unshift(command);
    this._socket.commandQueue.push(new Command(resp.stringify(args, true), callback));
    execQueue(this._socket);
  });
}

// This Command constructor is ever so slightly faster than using an object literal, but more importantly, using
// a named constructor helps it show up meaningfully in the V8 CPU profiler and in heap snapshots.
function Command(data, callback) {
  this.data = data;
  this.callback = callback;
}

function execQueue(socket, init) {
  if (!init && (!socket.redisConnected || socket.pendingWaiter)) return;
  var count = socket.commandsHighWater;
  var commands = [];

  while (socket.commandQueue.length && count--)
    commands.push(socket.commandQueue.shift());

  if (!commands.length) return socket.emit('queueDrain');
  socket.pendingWaiter = {commands: commands};
  tool.each(commands, function (command) {
    if (socket.debugMode) tool.log({socketWrite: command.data});
    socket.write(command.data);
  });
}

function flushPending(socket, error) {
  if (!socket.pendingWaiter) return;
  tool.each(socket.pendingWaiter.commands, function (command) {
    command.callback(error);
  }, null, true);
  socket.pendingWaiter = null;
}

function flushAll(socket, error) {
  flushPending(socket, error);
  var commandQueue = socket.commandQueue;
  while (commandQueue.length) commandQueue.shift().callback(error);
}

var messageTypes = {message: true, pmessage: true};

function _isMessageReply(reply) {
  return reply && messageTypes[reply[0]];
}

var subReplyTypes = {subscribe: true, unsubscribe: true, psubscribe: true, punsubscribe: true};

function _isSubReply(reply) {
  return reply && subReplyTypes[reply[0]];
}
