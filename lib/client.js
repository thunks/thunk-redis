'use strict'
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

let clientId = 0

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
  this.IPMap = options.IPMap
  // {
  //   '172.17.0.2:7000': '127.0.0.1:7000',
  //   '172.17.0.2:7001': '127.0.0.1:7001',
  //   '172.17.0.2:7002': '127.0.0.1:7002',
  //   '172.17.0.2:7003': '127.0.0.1:7003',
  //   '172.17.0.2:7004': '127.0.0.1:7004',
  //   '172.17.0.2:7005': '127.0.0.1:7005'
  // }
}

RedisState.prototype.getConnection = function (slot) {
  let connection = slot != null && this.pool[this.slots[slot]]
  if (!connection || !connection.connected) connection = this.connection
  if (!connection || connection.ended) return new Error('connection(' + slot + ') not exist')
  return connection
}

RedisState.prototype.resetConnection = function () {
  if (this.connection && this.connection.connected) return

  let connection = null
  const keys = Object.keys(this.pool)
  for (let i = 0; i < keys.length; i++) {
    connection = this.pool[keys[i]]
    if (connection.connected) break
  }
  this.connection = connection
}

function RedisClient (addressArray, options) {
  EventEmitter.call(this)
  tool.setPrivate(this, '_redisState', new RedisState(options, addressArray))

  const ctx = this
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
  const ctx = this
  const redisState = this._redisState
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
  const redisState = this._redisState
  id = redisState.slots[id] || id
  if (!redisState.pool[id]) throw new Error(id + ' is not exist')
  redisState.slots[-1] = id
  return this
}

RedisClient.prototype.clientUnref = function () {
  if (this._redisState.ended) return
  for (const key of Object.keys(this._redisState.pool)) {
    const connection = this._redisState.pool[key]
    if (connection.connected) connection.socket.unref()
    else {
      connection.socket.once('connect', function () {
        this.unref()
      })
    }
  }
}

RedisClient.prototype.clientEnd = function (hadError) {
  const redisState = this._redisState
  if (redisState.ended) return
  redisState.ended = true
  redisState.connected = false

  clearInterval(redisState.pingInterval)
  redisState.pingInterval = null

  for (const key of Object.keys(redisState.pool)) {
    const connection = redisState.pool[key]
    if (connection) connection.disconnect()
  }
  const commandQueue = redisState.commandQueue
  const message = (hadError && hadError.toString()) || 'The redis connection was ended'
  while (commandQueue.length) commandQueue.shift().callback(new Error(message))

  this.emit('close', hadError)
}

RedisClient.prototype.clientState = function () {
  const redisState = this._redisState
  const state = {
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

  for (const key of Object.keys(redisState.pool)) {
    const connection = redisState.pool[key]
    state.pool[connection.id] = connection.replicationIds ? connection.replicationIds.slice() : []
  }
  return state
}
