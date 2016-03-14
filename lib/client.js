/**
 * thunk-redis - https://github.com/thunks/thunk-redis
 *
 * MIT Licensed
 */

const util = require('util')
const thunks = require('thunks')
const EventEmitter = require('events').EventEmitter

const tool = require('./tool')
const Queue = require('./queue')
const initCommands = require('./commands').initCommands
const createConnections = require('./connection').createConnections
const thunk = thunks()

var clientId = 0

module.exports = RedisClient

function RedisState (options, addressArray) {
  this.options = options
  this.addressArray = addressArray

  this.database = 0
  this.ended = false
  this.connected = false
  this.connection = null
  this.clusterMode = false
  this.timestamp = Date.now()
  this.clientId = ++clientId
  this.commandQueue = new Queue()
  this.pingInterval = null
  this.pool = Object.create(null)
  // {
  //   '127.0.0.1:7001': connection
  //   ...
  // }
  // masterSocket.replicationIds = ['127.0.0.1:7003', ...]

  this.slots = Object.create(null)
  // {
  //   '0': masterConnectionId
  //   '1': masterConnectionId
  // /  ...
  // }
}

RedisState.prototype.getConnection = function (slot) {
  var connection = slot != null && this.pool[this.slots[slot]]
  if (!connection || !connection.connected) connection = this.connection
  if (!connection || connection.ended) return new Error('connection(' + slot + ') not exist')
  return connection
}

RedisState.prototype.resetConnection = function () {
  if (this.connection && this.connection.connected) return

  var connection = null
  var keys = Object.keys(this.pool)
  for (var i = 0; i < keys.length; i++) {
    connection = this.pool[keys[i]]
    if (connection.connected) break
  }
  this.connection = connection
}

function RedisClient (addressArray, options) {
  EventEmitter.call(this)
  tool.setPrivate(this, '_redisState', new RedisState(options, addressArray))

  var ctx = this
  this._redisState.thunkE = thunks(function (error) {
    ctx.emit('error', error)
  })

  this.clientConnect()
  // useage: client.clientReady(taskFn), task will be called after connected
  this.clientReady = thunk.persist.call(this, function (callback) {
    ctx.once('connect', callback)
  })
}

util.inherits(RedisClient, EventEmitter)
initCommands(RedisClient.prototype)

RedisClient.prototype.clientConnect = function () {
  var ctx = this
  var redisState = this._redisState
  redisState.ended = false
  createConnections(this, redisState.addressArray)

  // send a ping packet
  if (redisState.options.pingInterval && !redisState.pingInterval) {
    redisState.pingInterval = setInterval(function () {
      redisState.thunkE(ctx.ping())()
    }, redisState.options.pingInterval)
  }
}

// deprecate!
RedisClient.prototype.clientSwitch = function (id) {
  console.warn('clientSwitch is deprecated, It will be removed in next version!')
  var redisState = this._redisState
  id = redisState.slots[id] || id
  if (!redisState.pool[id]) throw new Error(id + ' is not exist')
  redisState.slots[-1] = id
  return this
}

RedisClient.prototype.clientUnref = function () {
  if (this._redisState.ended) return
  tool.each(this._redisState.pool, function (connection) {
    if (connection.connected) connection.socket.unref()
    else {
      connection.socket.once('connect', function () {
        this.unref()
      })
    }
  })
}

RedisClient.prototype.clientEnd = function (hadError) {
  var redisState = this._redisState
  if (redisState.ended) return
  redisState.ended = true
  redisState.connected = false

  clearInterval(redisState.pingInterval)
  redisState.pingInterval = null

  tool.each(redisState.pool, function (connection, key) {
    if (connection) connection.disconnect()
  })
  var commandQueue = redisState.commandQueue
  var message = (hadError && hadError.toString()) || 'The redis connection was ended'
  while (commandQueue.length) commandQueue.shift().callback(new Error(message))

  this.emit('close', hadError)
}

RedisClient.prototype.clientState = function () {
  var redisState = this._redisState
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
  }

  tool.each(redisState.pool, function (connection) {
    state.pool[connection.id] = connection.replicationIds ? connection.replicationIds.slice() : []
  })
  return state
}
