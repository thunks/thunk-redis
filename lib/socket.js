'use strict';

var net = require('net'),
  util = require('util'),
  Thunk = require('thunks')(),
  Parser = require('./hiredis-parser'),
  tool = require('./tool');

exports.initSocket = initSocket;
exports.sendCommand = sendCommand;

function initSocket(options) {
  var redis = this, parser = new Parser(), socket = net.createConnection(options);

  socket.setNoDelay(redis.options.noDelay);
  socket.setKeepAlive(redis.options.keepAlive);
  socket.setTimeout(redis.options.timeout);

  socket.pendingCommand = null;
  socket.redisConnected = false;

  tool.setPrivate.call(socket, 'commandQueue', []);
  tool.setPrivate.call(redis, 'socket', socket);


  socket.on('connect', function () {
    console.log('::connect');
    socket.redisConnected = true;
    if (redis.options.authPass) {
      redis.auth(redis.options.authPass)(redisReady);
    } else {
      redisReady.call(redis);
    }
  }).
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
    flushQueue.call(socket);

    if (command) {
      if (util.isError(reply)) {
        command.callback(reply);
        redis.emit('error', reply);
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
    console.log('::error', error);
    flushError.call(socket, error);
    redis.emit('error', error);
  }).
  on('close', function (isException) {
    console.log('::close', isException);
    flushError.call(socket, new Error('The redis connection was closed'));
    redis.emit('close');
  }).
  on('timeout', function () {
    console.log('::timeout');
  }).
  on('end', function () {
    console.log('::end');
    redis.emit('end');
  }).
  on('drain', function () {
    console.log('::drain');
  }).
  on('queueDrain', function () {
    console.log('::queueDrain');
    redis.emit('drain');
  });

  return socket;
}

function redisReady() {
  if (this.options.database) {
    this.select(this.options.database)(function () {
      this.emit('connect');
    });
  } else {
    this.emit('connect');
    flushQueue.call(this.socket);
  }
}

function sendCommand(command, args) {
	var redis = this, socket = this.socket;

  return Thunk.call(this, function (callback) {
    var arg, data, argsNum = args ? args.length : 0;

    data = '*' + (1 + argsNum) + '\r\n';
    data += '$' + Buffer.byteLength(command) + '\r\n' + command + '\r\n';

    if (argsNum) {
      for (var i = 0; i < argsNum; ++i) {
        arg = String(args[i]);
        data += '$' + Buffer.byteLength(arg) + '\r\n' + arg + '\r\n';
      }
    }

    socket.commandQueue.push(new Command(new Buffer(data), callback));
    flushQueue.call(socket);
  });
}

// This Command constructor is ever so slightly faster than using an object literal, but more importantly, using
// a named constructor helps it show up meaningfully in the V8 CPU profiler and in heap snapshots.
function Command(data, callback) {
  this.data = data;
  this.callback = callback;
}

function flushQueue() {
  if (!this.redisConnected || this.pendingCommand) return;
  if (!this.commandQueue.length) return this.emit('queueDrain');

  var command = this.commandQueue.shift();
  this.pendingCommand = command;
  this.write(command.data);
}

function flushError(error) {
  var command = this.commandQueue.shift();
  while (command) {
    command.callback(error);
    command = this.commandQueue.shift();
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
