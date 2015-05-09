'use strict';

var util = require('util');
var thunks = require('thunks');
var EventEmitter = require('events').EventEmitter;

var tool = require('./tool');
var Queue = require('./queue');
var initCommands = require('./commands').initCommands;
var createConnections = require('./connection').createConnections;

var clientId = 0;

module.exports = RedisClient;

function RedisState(options) {
  this.options = options;

  this.database = 0;
  this.ended = false;
  this.connected = false;
  this.clusterMode = false;
  this.timestamp = Date.now();
  this.clientId = ++clientId;
  this.commandQueue = new Queue();
  this.pool = Object.create(null);
  // {
  //   '127.0.0.1:7001': connection
  //   ...
  // }
  // masterSocket.replicationIds = ['127.0.0.1:7003', ...]

  this.slots = Object.create(null);
  // {
  //   '-1': defaultConnectionId
  //   '0': masterConnectionId
  //   '1': masterConnectionId
  ///  ...
  // }

}

function RedisClient(addressArray, options) {
  EventEmitter.call(this);
  tool.setPrivate(this, '_redisState', new RedisState(options));

  var ctx = this;
  this._redisState.thunk = thunks(function(error) {
    ctx.emit('error', error);
  });
  createConnections(this, addressArray);
}

util.inherits(RedisClient, EventEmitter);
initCommands(RedisClient.prototype);

// id: '127.0.0.1:7000', slot: -1, 0, 1, ...
RedisClient.prototype.clientSwitch = function(id) {
  var redisState = this._redisState;
  id = redisState.slots[id] || id;
  if (!redisState.pool[id]) throw new Error(id + ' is not exist');
  redisState.slots[-1] = id;
  return this;
};

RedisClient.prototype.clientUnref = function() {
  if (this._redisState.ended) return;
  tool.each(this._redisState.pool, function(connection) {
    if (connection.connected) connection.socket.unref();
    else connection.socket.once('connect', function() {
      this.unref();
    });
  });
};

RedisClient.prototype.clientEnd = function(hadError) {
  if (this._redisState.ended) return;
  this._redisState.ended = true;
  this._redisState.connected = false;
  tool.each(this._redisState.pool, function(connection) {
    connection.disconnect();
  });
  var commandQueue = this._redisState.commandQueue;
  var message = (hadError && hadError.toString()) || 'The redis connection was ended';
  while (commandQueue.length) commandQueue.shift().callback(new Error(message));

  this._redisState.pool = null;
  this.emit('close', hadError);
  this.removeAllListeners();
};

RedisClient.prototype.clientState = function() {
  var redisState = this._redisState;
  var state = {
    pool: {},
    ended: redisState.ended,
    clientId: redisState.clientId,
    database: redisState.database,
    connected: redisState.connected,
    timestamp: redisState.timestamp,
    clusterMode: redisState.clusterMode,
    defaultConnection: redisState.slots[-1],
    commandQueueLength: redisState.commandQueue.length
  };

  tool.each(redisState.pool, function(connection) {
    state.pool[connection.id] = connection.replicationIds ? connection.replicationIds.slice() : [];
  });
  return state;
};
