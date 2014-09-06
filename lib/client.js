'use strict';

var Thunk = require('thunks');
var util = require('util');
var tool = require('./tool');
var initSocket = require('./socket').initSocket;
var sendCommand = require('./socket').sendCommand;
var initCommands = require('./commands').initCommands;
var EventEmitter = require('events').EventEmitter;
var connectionId = 0;

module.exports = RedisClient;

function RedisClient(netOptions, options) {

  tool.setPrivate(this, 'options', options);
  tool.setPrivate(this, 'status', {
    connectionId: ++connectionId,
    database: 0,
    monitorMode: false,
    pubSubMode: false
  });

  EventEmitter.call(this);
  initSocket(this, netOptions);
}

util.inherits(RedisClient, EventEmitter);
initCommands(RedisClient.prototype);

RedisClient.prototype.unref = function () {
  if (this.status.connected) {
    this.Socket.unref();
  } else {
    this.once('connect', function () {
      this.unref();
    });
  }
};

RedisClient.prototype.end = function () {
  this.removeAllListeners();
  this.socket.destroySoon();
};

var emit = RedisClient.prototype.emit;

RedisClient.prototype.emit = function (type) {
  var args;
  emit.apply(this, arguments);
  if (this._events.all) {
    args = tool.slice(arguments);
    args.unshift('all');
    emit.apply(this, args);
  }
};

Object.freeze(RedisClient.prototype);
