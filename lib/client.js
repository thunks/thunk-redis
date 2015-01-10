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

function RedisState() {
  this.connectionId = ++connectionId;
  this.database = 0;
  this.timestamp = Date.now();
  this.monitorMode = false;
  this.pubSubMode = false;
  this.connected = false;
  this.ended = false;
}

function RedisClient(netOptions, options) {
  EventEmitter.call(this);

  tool.setPrivate(this, '_options', options);
  tool.setPrivate(this, '_redisState', new RedisState());

  initSocket(this, netOptions, {
    attempts: 1,
    commandQueue: [],
    frequency: {}
  });
}

util.inherits(RedisClient, EventEmitter);
initCommands(RedisClient.prototype);

RedisClient.prototype.clientUnref = function() {
  if (this._redisState.ended) return;
  if (this._redisState.connected) {
    this._socket.unref();
  } else {
    this.once('connect', function() {
      this.unref();
    });
  }
};

RedisClient.prototype.clientEnd = function() {
  this._redisState.ended = true;
  this._socket.end();
  this._socket.destroy();
  this.removeAllListeners();
};

RedisClient.prototype.clientState = function() {
  var state = {
    frequency: {},
    commandQueueLength: this._socket.commandQueue.length
  };
  tool.each(this._redisState, function(value, key) {
    state[key] = value;
  });
  tool.each(this._socket.frequency, function(value, key) {
    state.frequency[key] = value;
  });
  return state;
};

Object.freeze(RedisClient.prototype);
