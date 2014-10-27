'use strict';

var net = require('net');
var util = require('util');
var JSONKit = require('jsonkit');
var Thunk = require('thunks')();
var resp = require('respjs');
var tool = require('./tool');

exports.initSocket = initSocket;
exports.sendCommand = sendCommand;

function initSocket(redis, options) {
  var waitForAuth = false, waitForSelect = false;
  var socket = net.createConnection(options);

  socket.setNoDelay(redis._options.noDelay);
  socket.setKeepAlive(redis._options.keepAlive);
  socket.setTimeout(redis._options.timeout);

  socket.pendingWaiter = null;
  socket.redisConnected = false;
  socket.commandsHighWater = redis._options.commandsHighWater;
  socket.returnBuffers = redis._options.returnBuffers;
  socket.debugMode = redis._options.debugMode;

  tool.setPrivate(socket, 'commandQueue', []);

  function checkReady() {
    if (waitForAuth || waitForSelect) return flushQueue(socket, true);
    redis._redisState.connected = socket.redisConnected = true;
    redis.emit('connect');
    flushQueue(socket);
  }

  if (redis._options.authPass) {
    waitForAuth = true;
    redis.auth(redis._options.authPass)(function (error) {
      if (error) throw error;
      waitForAuth = false;
      checkReady();
    });
  }

  if (redis._options.database) {
    waitForSelect = true;
    redis.select(redis._options.database)(function (error) {
      if (error) throw error;
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
      flushAll(socket, new Error('The redis connection was timeout'));
      redis.emit('timeout');
    })
    .on('end', function () {
      flushAll(socket, new Error('The redis connection was ended'));
      redis.emit('end');
    })
    .on('queueDrain', function () {
      redis.emit('drain');
    });

  return socket;
}

function initResp(redis, reply) {
  var socket = redis._socket;

  return new resp.Resp({
    expectResCount: reply.commands.length,
    returnBuffers: socket.returnBuffers
  })
  .on('error', function (error) {
    if (socket.debugMode) tool.log({respError: error});

    redis.emit('error', error);
    flushPending(socket, error);
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
      if (socket.debugMode) tool.log({Unexpected: data});
      redis.emit('error', new Error('Unexpected reply: ' + data));
    }
  })
  .on('end', function () {
    socket.pendingWaiter = null;
    flushQueue(socket);
  });

}

function sendCommand(redis, command, args) {
  return Thunk.call(redis, function (callback) {
    if (!Array.isArray(args)) args = [];
    args.unshift(command);
    this._socket.commandQueue.push(new Command(resp.stringify(args, true), callback));
    flushQueue(this._socket);
  });
}

// This Command constructor is ever so slightly faster than using an object literal, but more importantly, using
// a named constructor helps it show up meaningfully in the V8 CPU profiler and in heap snapshots.
function Command(data, callback) {
  this.data = data;
  this.callback = callback;
}

function flushQueue(socket, force) {
  if (!force && (!socket.redisConnected || socket.pendingWaiter)) return;
  var count = socket.commandsHighWater;
  var commands = [];

  while (socket.commandQueue.length && count--)
    commands.push(socket.commandQueue.shift());

  if (!commands.length) return socket.emit('queueDrain');
  socket.pendingWaiter = {commands: commands};
  JSONKit.each(commands, function (command) {
    if (socket.debugMode) tool.log({socketWrite: command.data});

    socket.write(command.data);
  });
}

function flushPending(socket, error) {
  if (!socket.pendingWaiter || !socket.pendingWaiter.commands.length) return;
  JSONKit.each(socket.pendingWaiter.commands, function (command) {
    command.callback(error);
  });
  socket.pendingWaiter = null;
}

function flushAll(socket, error) {
  flushPending(socket, error);
  var command = socket.commandQueue.shift();
  while (command) {
    command.callback(error);
    command = socket.commandQueue.shift();
  }
}

var messageTypes = {message: true, pmessage: true};

function _isMessageReply(reply) {
  return reply && messageTypes[reply[0]];
}

var subReplyTypes = {subscribe: true, unsubscribe: true, psubscribe: true, punsubscribe: true};

function _isSubReply(reply) {
  return reply && subReplyTypes[reply[0]];
}
