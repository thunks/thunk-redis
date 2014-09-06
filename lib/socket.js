'use strict';

var net = require('net');
var util = require('util');
var Thunk = require('thunks')();
var Parser = require('./hiredis-parser');
var tool = require('./tool');

exports.initSocket = initSocket;
exports.sendCommand = sendCommand;

function initSocket(redis, options) {
  var waitForAuth = false, waitForSelect = false;
  var parser = new Parser(redis.options.returnBuffers);
  var socket = net.createConnection(options);

  socket.setNoDelay(redis.options.noDelay);
  socket.setKeepAlive(redis.options.keepAlive);
  socket.setTimeout(redis.options.timeout);

  socket.pendingCommand = null;
  socket.redisConnected = false;

  tool.setPrivate(socket, 'commandQueue', []);
  tool.setPrivate(redis, 'socket', socket);

  function checkReady() {
    if (waitForAuth || waitForSelect) return flushQueue(socket, true);
    socket.redisConnected = true;
    redis.emit('connect');
    flushQueue(socket);
  }

  if (redis.options.authPass) {
    waitForAuth = true;
    redis.auth(redis.options.authPass)(function (error) {
      if (error) throw error;
      waitForAuth = false;
      checkReady();
    });
  }

  if (redis.options.database) {
    waitForSelect = true;
    redis.select(redis.options.database)(function (error) {
      if (error) throw error;
      waitForSelect = false;
      checkReady();
    });
  }

  socket.on('connect', checkReady).
  on('data', function (chunk) {
    var reply, command = socket.pendingCommand;

    try {
      reply = parser.exec(chunk);
    } catch (error) {
      return socket.emit('error', error);
    }

    if (_isMessageReply(reply)) return redis.emit.apply(redis, reply);
    if (redis.status.monitorMode) return redis.emit('monitor', reply);

    socket.pendingCommand = null;
    flushQueue(socket);

    if (command) {
      if (util.isError(reply)) {
        command.callback(reply);
        if (redis._events.error) redis.emit('error', reply);
      } else {
        command.callback(null, reply);
        // (pun)subscribe can generate many replies. The first
        // one is returned. All are emitted as events.
        if (_isSubReply(reply)) redis.emit.apply(redis, reply);
      }
    } else if (_isSubReply(reply)) {
      redis.emit.apply(redis, reply);
    } else {
      socket.emit('error', new Error('Unexpected reply: ' + reply));
    }

  }).
  on('error', function (error) {
    flushError(socket, error);
    redis.emit('error', error);
  }).
  on('close', function (isException) {
    flushError(socket, new Error('The redis connection was closed'));
    redis.emit('close');
  }).
  on('timeout', function () {
    redis.emit('timeout');
  }).
  on('end', function () {
    redis.emit('end');
  }).
  // on('drain', function () {
  //   // console.log('::drain');
  // }).
  on('queueDrain', function () {
    redis.emit('drain');
  });

  return socket;
}

function sendCommand(redis, command, args) {
  return Thunk.call(redis, function (callback) {
    var arg, data, argsNum = args ? args.length : 0;

    data = '*' + (1 + argsNum) + '\r\n';
    data += '$' + Buffer.byteLength(command) + '\r\n' + command + '\r\n';

    if (argsNum) {
      for (var i = 0; i < argsNum; ++i) {
        arg = String(args[i]);
        data += '$' + Buffer.byteLength(arg) + '\r\n' + arg + '\r\n';
      }
    }

    this.socket.commandQueue.push(new Command(new Buffer(data), callback));
    flushQueue(this.socket);
  });
}

// This Command constructor is ever so slightly faster than using an object literal, but more importantly, using
// a named constructor helps it show up meaningfully in the V8 CPU profiler and in heap snapshots.
function Command(data, callback) {
  this.data = data;
  this.callback = callback;
}

function flushQueue(socket, force) {
  if (!force && (!socket.redisConnected || socket.pendingCommand)) return;

  var command = socket.commandQueue.shift();
  if (!command) return socket.emit('queueDrain');
  socket.pendingCommand = command;
  socket.write(command.data);
}

function flushError(socket, error) {
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
