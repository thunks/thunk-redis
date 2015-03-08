'use strict';

var util = require('util');
var resp = require('respjs');
var Thunk = require('thunks')();
var EventEmitter = require('events').EventEmitter;

var tool = require('./tool');
var Queue = require('./queue');
var initCommands = require('./commands').initCommands;
var createSockets = require('./socket').createSockets;

var connectionId = 0;

module.exports = RedisClient;

function RedisState(options) {
  this.database = 0;
  this.ended = false;
  this.connected = false;
  this.pubSubMode = false;
  this.monitorMode = false;
  this.timestamp = Date.now();
  this.connectionId = ++connectionId;
  this.options = options;
  this.clusterMode = false;
  this.commandQueue = new Queue();
  this.pool = Object.create(null);
  // {
  //   '127.0.0.1:7001': socket
  //   ...
  // }
  // masterSocket.replicaIds = ['127.0.0.1:7003', ...]
  this.slots = Object.create(null);
  // {
  //   '-1': defaultSocket
  //   '0': masterSocket
  //   '1': masterSocket
  ///  ...
  // }
}

function RedisClient(netOptions, options) {
  EventEmitter.call(this);
  tool.setPrivate(this, '_redisState', new RedisState(options));
  createSockets(this, netOptions);
}

util.inherits(RedisClient, EventEmitter);
initCommands(RedisClient.prototype);

// redisId: '127.0.0.1:7000'
RedisClient.prototype.clientSwitch = function(redisId) {
  var redisState = this._redisState;
  if (!redisState.pool[redisId]) throw new Error(redisId + ' is not exist');
  redisState.slots[-1] = redisId;
  if (!redisState.pool[redisId].redisMaster) this.emit('warn', new Error(redisId + ' is not master'));
  return this;
};

RedisClient.prototype.clientUnref = function() {
  if (this._redisState.ended) return;
  tool.each(this._redisState.pool, function(socket) {
    socket.connected = false;
    if (socket.connected) socket.unref();
    else socket.once('connect', function() {
      this.unref();
    });
  });
};

RedisClient.prototype.clientEnd = function(hadError) {
  if (this._redisState.ended) return;
  this._redisState.ended = true;
  this._redisState.connected = false;
  tool.each(this._redisState.pool, function(socket) {
    socket.connected = false;
    socket.end();
    socket.destroy();
  });
  this._redisState.pool = null;
  if (hadError) this.emit('close', hadError);
  else this.emit('end');
  this.removeAllListeners();
};

RedisClient.prototype.clientState = function() {
  var redisState = this._redisState;
  var state = {
    pool: {},
    frequency: {},
    ended: redisState.ended,
    database: redisState.database,
    connected: redisState.connected,
    timestamp: redisState.timestamp,
    pubSubMode: redisState.pubSubMode,
    monitorMode: redisState.monitorMode,
    clusterMode: redisState.clusterMode,
    connectionId: redisState.connectionId,
    commandQueueLength: redisState.commandQueue.length,
    defaultSocket: redisState.slots[-1]
  };
  tool.each(redisState.pool, function(socket, id) {
    state.pool[id] = socket.replicaIds || null;
    state.frequency[id] = {};
    tool.each(socket.frequency, function(value, key) {
      state.frequency[id][key] = value;
    });
  });
  return state;
};
