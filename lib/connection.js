'use strict'
/**
 * thunk-redis - https://github.com/thunks/thunk-redis
 *
 * MIT Licensed
 */

const net = require('net')
const Resp = require('respjs')

const tool = require('./tool')
const Queue = require('./queue')

const thunk = require('thunks')()
const HIGHT_WATER_MARK = 15 * 1024

exports.sendCommand = sendCommand
exports.wrapIPv6Address = wrapIPv6Address
exports.createConnections = createConnections

function sendCommand (redis, commandName, args, additionalCallbacks, responseHook) {
  return thunk.call(redis, function (callback) {
    let command = createCommand(this, commandName, args, callback, additionalCallbacks, responseHook)
    if (command) dispatchCommands(this, command)
  })
}

function createConnections (redis, addressArray) {
  addressArray.forEach(function (id) {
    createConnection(redis, id)
  })
}

function createConnection (redis, id) {
  let redisState = redis._redisState
  let connection = redisState.pool[id]
  if (!connection) connection = redisState.pool[id] = new Connection(redis, id)
  return connection
}

function Connection (redis, id) {
  this.id = id
  this.redis = redis

  this.attempts = 0
  this.retryDelay = 3000

  this.ended = false
  this.isMaster = false
  this.connected = false
  this.pubSubMode = false
  this.monitorMode = false
  this.queue = new Queue()
  this.pendingQueue = new Queue()
  this.pendingBytes = 0
  this.replicationIds = null
  this.bufBulk = redis._redisState.options.bufBulk
  this.connect()

  // cache script sha1 in persist thunk
  this.evalshaT = Object.create(null)
}

Connection.prototype.returnCommands = function () {
  this.rescuePending()
  this.queue.migrateTo(this.redis._redisState.commandQueue)
  return this
}

Connection.prototype.rescuePending = function () {
  while (this.pendingQueue.length) {
    let command = this.pendingQueue.pop()
    if (command.slot != null && command.name !== 'debug') this.queue.unshift(command)
  }
  return this
}

Connection.prototype.disconnect = function () {
  if (this.ended) return
  this.ended = true
  this.returnCommands()
  this.destroy()

  let redisState = this.redis._redisState
  delete redisState.pool[this.id]
  redisState.resetConnection()
}

Connection.prototype.destroy = function () {
  this.connected = false
  this.resp.removeAllListeners()
  this.socket.removeAllListeners()
  this.socket.end()
  this.socket.destroy()
  this.socket = null
}

Connection.prototype.connect = function () {
  let ctx = this

  this.connected = false
  if (this.socket) this.destroy()

  let address = unwrapAddress(this.id)
  let options = this.redis._redisState.options
  let socket = this.socket = net.createConnection({
    host: address[0],
    port: +address[1]
  })

  socket.setNoDelay(options.noDelay)
  socket.setTimeout(0)
  socket.setKeepAlive(true)

  this.resp = ctx.createResp()

  socket
    .once('connect', function () {
      // reset
      ctx.attempts = 0
      ctx.retryDelay = 3000

      ctx.checkConnection()
    })
    .on('error', function (error) {
      ctx.redis.emit('error', error)
    })
    .once('close', function (hadError) {
      ctx.reconnecting()
    })
    .once('end', function () {
      if (!ctx.redis._redisState.clusterMode) ctx.tryRemove(null, true)
    })

  socket.pipe(this.resp)
  return this
}

Connection.prototype.reconnecting = function () {
  let ctx = this
  let redisState = this.redis._redisState
  let options = redisState.options
  this.connected = false
  if (redisState.ended || this.ended) return

  redisState.resetConnection()
  this.attempts++
  if (this.attempts <= options.maxAttempts) {
    this.rescuePending()
    this.retryDelay *= 1.2
    if (this.retryDelay >= options.retryMaxDelay) {
      this.retryDelay = options.retryMaxDelay
    }

    setTimeout(function () {
      ctx.connect()
      ctx.redis.emit('reconnecting', {
        delay: ctx.retryDelay,
        attempts: ctx.attempts
      })
    }, this.retryDelay)
  } else {
    let err = new Error('Reconnect ECONNREFUSED ' + this.id)
    let address = unwrapAddress(this.id)
    err.errno = err.code = 'ECONNREFUSED'
    err.address = address[0]
    err.port = +address[1]
    err.attempts = this.attempts - 1
    this.tryRemove(err, true)
  }
}

Connection.prototype.checkConnection = function () {
  let ctx = this
  let redisState = this.redis._redisState
  let options = redisState.options

  redisState.thunkE(function (callback) {
    // auth
    if (!options.authPass) return callback()
    let command = createCommand(ctx.redis, 'auth', [options.authPass], callback)
    if (command) ctx.writeCommand(command)
  })(function () {
    // check replication and cluster
    return function (callback) {
      let command = createCommand(ctx.redis, 'info', ['default'], function (error, res) {
        if (!res) return callback(error)
        // 兼容 returnBuffer 模式
        res = res.toString()
        ctx.isMaster = checkMaster(res)
        redisState.clusterMode = checkCluster(res)
        // Replication 模式下如果只启用 master，则自动关闭 slave
        if (redisState.options.onlyMaster && !redisState.clusterMode && !ctx.isMaster) {
          return ctx.tryRemove(null, true)
        }
        callback()
      })
      if (command) ctx.writeCommand(command)
    }
  })(function () {
    // check selected database
    if (redisState.clusterMode || !options.database) return
    return function (callback) {
      let command = createCommand(ctx.redis, 'select', [options.database], function (error, res) {
        if (error) return callback(error)
        redisState.database = options.database
        callback()
      })
      if (command) ctx.writeCommand(command)
    }
  })(function () {
    ctx.connected = true
    redisState.resetConnection()
    ctx.redis.emit('connection', ctx)
    // default socket connected
    if (redisState.connected) ctx.flushCommand()
    else {
      redisState.connected = true
      ctx.redis.emit('connect')
      dispatchCommands(ctx.redis)
    }
  })
}

Connection.prototype.createResp = function () {
  let ctx = this
  let redis = this.redis
  let redisState = redis._redisState
  let pendingQueue = this.pendingQueue

  return new Resp({bufBulk: ctx.bufBulk})
    .on('error', function (error) {
      ctx.rescuePending()
      redis.emit('error', error)
    })
    .on('drain', function () {
      ctx.flushCommand()
    })
    .on('data', function (data) {
      let command = pendingQueue.first()

      if (ctx.monitorMode && (!command || command.name !== 'quit')) {
        return redis.emit('monitor', data)
      }

      if (ctx.pubSubMode && isMessageReply(data)) {
        return redis.emit.apply(redis, data)
      }

      pendingQueue.shift()
      if (!command) {
        if (data[0] === 'unsubscribe' || data[0] === 'punsubscribe') {
          ctx.pubSubMode = data[2] > 0
          return redis.emit.apply(redis, data)
        }
        return redis.emit('error', new Error('Unexpected reply: ' + data))
      }

      if (data instanceof Error) {
        data.node = ctx.id

        let id, ip, _connection
        switch (data.code) {
          case 'MOVED':
            ip = data.message.replace(/.+\s/, '')
            id = wrapIPv6Address(redisState.IPMap[ip] || ip)
            if (command.slot !== -1) redisState.slots[command.slot] = id
            _connection = createConnection(redis, id)
            _connection.flushCommand(command)
            break

          case 'ASK':
            ip = data.message.replace(/.+\s/, '')
            id = wrapIPv6Address(redisState.IPMap[ip] || ip)
            _connection = createConnection(redis, id)
            _connection.flushCommand(createCommand(redis, 'asking', [], function (error, res) {
              if (error) return command.callback(error)
              _connection.flushCommand(command)
            }))
            break

          case 'CLUSTERDOWN':
            command.callback(data)
            return redis.emit('error', data)

          default:
            command.callback(data)
        }

        return redis.emit('warn', data)
      }

      switch (command.name) {
        case 'monitor':
          ctx.monitorMode = true
          return command.callback(null, data)

        case 'subscribe':
        case 'psubscribe':
          ctx.pubSubMode = true
          command.callback()
          return redis.emit.apply(redis, data)

        case 'unsubscribe':
        case 'punsubscribe':
          ctx.pubSubMode = data[2] > 0
          command.callback()
          return redis.emit.apply(redis, data)

        default:
          return command.callback(null, data)
      }
    })
}

Connection.prototype.tryRemove = function (error, tryEnd) {
  let redis = this.redis
  if (this.ended) return

  this.disconnect()
  if (error) redis.emit('error', error)
  if (tryEnd && !Object.keys(this.redis._redisState.pool).length) redis.clientEnd(error)
  else {
    // dispatch commands again
    process.nextTick(function () {
      dispatchCommands(redis)
    })
  }
}

Connection.prototype.sendCommand = function (commandName, args, additionalCallbacks, responseHook) {
  let ctx = this
  return thunk.call(this.redis, function (callback) {
    let command = createCommand(this, commandName, args, callback, additionalCallbacks, responseHook)
    if (command) ctx.flushCommand(command)
  })
}

Connection.prototype.flushCommand = function (command) {
  // `this.pendingBytes` lead to pipeline.
  if (!this.connected || this.pendingBytes) {
    if (command) this.queue.push(command)
    return this
  }

  let ctx = this
  let buf = null
  let bufs = []
  while (this.queue.length && this.pendingBytes < HIGHT_WATER_MARK) {
    buf = this.compileCommand(this.queue.shift())
    this.pendingBytes += buf.length
    bufs.push(buf)
  }
  if (command) {
    if (this.queue.length) this.queue.push(command)
    else {
      buf = this.compileCommand(command)
      this.pendingBytes += buf.length
      bufs.push(buf)
    }
  }
  if (this.pendingBytes) {
    buf = bufs.length === 1 ? bufs[0] : Buffer.concat(bufs, this.pendingBytes)
    this.socket.write(buf, function () {
      ctx.pendingBytes = 0
      ctx.flushCommand()
    })
  }
  return this
}

Connection.prototype.compileCommand = function (command) {
  this.pendingQueue.push(command)
  let additionalCallbacks = command.additionalCallbacks
  while (additionalCallbacks-- > 0) {
    this.pendingQueue.push({
      name: command.name,
      callback: noOp
    })
  }
  return command.data
}

Connection.prototype.writeCommand = function (command) {
  this.socket.write(this.compileCommand(command))
}

function Command (command, slot, data, callback, additionalCallbacks) {
  this.slot = slot
  this.data = data
  this.name = command
  this.callback = callback
  this.additionalCallbacks = additionalCallbacks || 0
}

function createCommand (redis, commandName, args, callback, additionalCallbacks, responseHook) {
  if (redis._redisState.ended) {
    callback(new Error('The redis client was ended'))
    return
  }

  let reqArray = tool.slice(args)
  reqArray.unshift(commandName)

  let _callback = !responseHook ? callback : function (err, res) {
    if (err != null) return callback(err)
    callback(null, responseHook.call(redis, res))
  }

  let buffer
  let slot = null
  try {
    if (redis._redisState.clusterMode) slot = redis.clientCalcSlot(reqArray)
    buffer = Resp.encodeRequest(reqArray)
    return new Command(reqArray[0], slot, buffer, _callback, additionalCallbacks)
  } catch (error) {
    _callback(error)
  }
}

function dispatchCommands (redis, command) {
  let redisState = redis._redisState
  let commandQueue = redisState.commandQueue

  if (!redisState.connected) {
    if (command) commandQueue.push(command)
    return
  }

  while (commandQueue.length) dispatchCommand(redisState, commandQueue.shift())
  if (command) dispatchCommand(redisState, command)
}

function dispatchCommand (redisState, command) {
  let res = redisState.getConnection(command.slot)
  if (res instanceof Connection) res.flushCommand(command)
  else {
    process.nextTick(function () {
      command.callback(res)
    })
  }
}

const messageTypes = Object.create(null)
messageTypes.message = true
messageTypes.pmessage = true

function isMessageReply (reply) {
  return reply && messageTypes[reply[0]]
}

function unwrapAddress (address) {
  return address.indexOf('[') === 0 ? address.slice(1).split(']:') : address.split(':')
}

// support IPv6
// https://www.ietf.org/rfc/rfc2732.txt
function wrapIPv6Address (host, port) {
  if (!port) {
    if (host.indexOf('[') === 0) return host
    host = host.split(':')
    port = host[1]
    host = host[0]
  }
  return '[' + host + ']:' + port
}

function checkMaster (info) {
  return info.indexOf('role:slave') === -1
}

function checkCluster (info) {
  return info.indexOf('cluster_enabled:1') > 0
}

function noOp () {}
