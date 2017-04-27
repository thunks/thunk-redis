'use strict'
/**
 * thunk-redis - https://github.com/thunks/thunk-redis
 *
 * MIT Licensed
 */

const defaultPort = 6379
const defaultHost = '127.0.0.1'
const url = require('url')
const tool = require('./tool')
const calcSlot = require('./slot')
const RedisClient = require('./client')
const wrapIPv6Address = require('./connection').wrapIPv6Address

exports.log = tool.log
exports.calcSlot = calcSlot

exports.createClient = function (port, host, options) {
  let addressArray

  if (Array.isArray(port)) {
    options = host
    addressArray = normalizeNetAddress(port)
  } else if (port && typeof port.port === 'number') {
    options = host
    addressArray = normalizeNetAddress([port])
  } else if (typeof port === 'string') {
    options = host || {}
    if (port.indexOf('redis://') === 0) addressArray = parseRedisURL(port, options)
    else addressArray = normalizeNetAddress([port])
  } else if (typeof port === 'number') {
    if (typeof host !== 'string') {
      options = host
      host = defaultHost
    }
    addressArray = normalizeNetAddress([{
      port: port,
      host: host
    }])
  } else {
    options = port
    addressArray = normalizeNetAddress([{
      port: defaultPort,
      host: defaultHost
    }])
  }

  options = options || {}
  options.bufBulk = !!options.returnBuffers
  options.authPass = (options.authPass || '') + ''
  options.noDelay = options.noDelay == null ? true : !!options.noDelay
  options.onlyMaster = options.onlyMaster == null ? true : !!options.onlyMaster

  options.database = options.database > 0 ? Math.floor(options.database) : 0
  options.maxAttempts = options.maxAttempts >= 0 ? Math.floor(options.maxAttempts) : 5
  options.pingInterval = options.pingInterval >= 0 ? Math.floor(options.pingInterval) : 0
  options.retryMaxDelay = options.retryMaxDelay >= 3000 ? Math.floor(options.retryMaxDelay) : 5 * 60 * 1000

  // https://github.com/thunks/thunk-redis/issues/19
  // To resolve redis internal IP and external IP problem. For example:
  // options.IPMap = {
  //   '172.17.0.2:7000': '127.0.0.1:7000',
  //   '172.17.0.2:7001': '127.0.0.1:7001',
  //   '172.17.0.2:7002': '127.0.0.1:7002',
  //   '172.17.0.2:7003': '127.0.0.1:7003',
  //   '172.17.0.2:7004': '127.0.0.1:7004',
  //   '172.17.0.2:7005': '127.0.0.1:7005'
  // }
  options.IPMap = options.IPMap || {}

  let client = new RedisClient(addressArray, options)

  if (!options.usePromise) return client

  // if `options.usePromise` is available, export promise commands API for a client instance.
  for (let command of client.clientCommands) {
    const commandMethod = client[command]
    client[command] = client[command.toUpperCase()] = function () {
      const thunk = commandMethod.apply(this, arguments)
      return new Promise(function (resolve, reject) {
        thunk(function (err, res) {
          return err == null ? resolve(res) : reject(err)
        })
      })
    }
  }
  return client
}

// return ['[192.168.0.100]:6379', '[::192.9.5.5]:6379']
function normalizeNetAddress (array) {
  return array.map(function (address) {
    if (typeof address === 'string') return wrapIPv6Address(address)
    if (typeof address === 'number') return wrapIPv6Address(defaultHost, address)
    address.host = address.host || defaultHost
    address.port = address.port || defaultPort
    return wrapIPv6Address(address.host, address.port)
  })
}

// Parse redis://USER:PASS@redis.io:5678
function parseRedisURL (redisUrl, options) {
  let obj = url.parse(redisUrl)
  if (obj.auth) options.authPass = obj.auth
  return [wrapIPv6Address(obj.host)]
}
