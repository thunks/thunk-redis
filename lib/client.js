'use strict';

var Thunk = require('thunks'),
  util = require('util'),
  tool = require('./tool'),
  initSocket = require('./socket').initSocket,
  sendCommand = require('./socket').sendCommand,
  initCommands = require('./commands').initCommands,
  EventEmitter = require('events').EventEmitter,
  connectionId = 0;

module.exports = RedisClient;

function RedisClient(netOptions, options) {

  tool.setPrivate.call(this, 'options', options);
  tool.setPrivate.call(this, 'status', {
    connectionId: ++connectionId,
    database: 0,
    monitorMode: false,
    pubSubMode: false
  });

  EventEmitter.call(this);
  initSocket.call(this, netOptions);
}

util.inherits(RedisClient, EventEmitter);
initCommands.call(RedisClient.prototype);

RedisClient.prototype.unref = function () {
  if (this.status.connected) return this.Socket.unref();
  this.once('connect', function () {
    this.unref();
  });
};

RedisClient.prototype.end = function () {
  this.removeAllListeners();
  this.socket.destroySoon();
};

var emit = RedisClient.prototype.emit;

RedisClient.prototype.emit = function (type) {
  emit.apply(this, arguments);
  if (this._events.all) emit.apply(this, ['all'].concat(tool.slice(arguments)));
};

Object.freeze(RedisClient.prototype);
