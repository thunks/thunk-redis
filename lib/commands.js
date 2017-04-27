'use strict'
/**
 * thunk-redis - https://github.com/thunks/thunk-redis
 *
 * MIT Licensed
 */

const thunk = require('thunks')()
const tool = require('./tool')
const calcSlot = require('./slot')
const sendCommand = require('./connection').sendCommand

// (Redis 3.9.101) `redis-cli command`
// `./check-commands`
// http://redis.io/commands/command
const commandsInfo = {
  append: [3, ['write', 'denyoom'], 1, 1, 1],
  asking: [1, ['fast'], 0, 0, 0],
  auth: [2, ['noscript', 'loading', 'stale', 'fast'], 0, 0, 0],
  bgrewriteaof: [1, ['admin'], 0, 0, 0],
  bgsave: [1, ['admin'], 0, 0, 0],
  bitcount: [-2, ['readonly'], 1, 1, 1],
  bitfield: [-2, ['write', 'denyoom'], 1, 1, 1],
  bitop: [-4, ['write', 'denyoom'], 2, -1, 1],
  bitpos: [-3, ['readonly'], 1, 1, 1],
  blpop: [-3, ['write', 'noscript'], 1, -2, 1],
  brpop: [-3, ['write', 'noscript'], 1, 1, 1],
  brpoplpush: [4, ['write', 'denyoom', 'noscript'], 1, 2, 1],
  client: [-2, ['admin', 'noscript'], 0, 0, 0],
  cluster: [-2, ['admin'], 0, 0, 0],
  command: [0, ['loading', 'stale'], 0, 0, 0],
  config: [-2, ['admin', 'loading', 'stale'], 0, 0, 0],
  dbsize: [1, ['readonly', 'fast'], 0, 0, 0],
  debug: [-1, ['admin', 'noscript'], 0, 0, 0],
  decr: [2, ['write', 'denyoom', 'fast'], 1, 1, 1],
  decrby: [3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  del: [-2, ['write'], 1, -1, 1],
  discard: [1, ['noscript', 'fast'], 0, 0, 0],
  dump: [2, ['readonly'], 1, 1, 1],
  echo: [2, ['fast'], 0, 0, 0],
  eval: [-3, ['noscript', 'movablekeys'], 0, 0, 0],
  evalsha: [-3, ['noscript', 'movablekeys'], 0, 0, 0],
  exec: [1, ['noscript', 'skip_monitor'], 0, 0, 0],
  exists: [-2, ['readonly', 'fast'], 1, -1, 1],
  expire: [3, ['write', 'fast'], 1, 1, 1],
  expireat: [3, ['write', 'fast'], 1, 1, 1],
  flushall: [1, ['write'], 0, 0, 0],
  flushdb: [1, ['write'], 0, 0, 0],
  geoadd: [-5, ['write', 'denyoom'], 1, 1, 1],
  geodist: [-4, ['readonly'], 1, 1, 1],
  geohash: [-2, ['readonly'], 1, 1, 1],
  geopos: [-2, ['readonly'], 1, 1, 1],
  georadius: [-6, ['write'], 1, 1, 1],
  georadiusbymember: [-5, ['write'], 1, 1, 1],
  get: [2, ['readonly', 'fast'], 1, 1, 1],
  getbit: [3, ['readonly', 'fast'], 1, 1, 1],
  getrange: [4, ['readonly'], 1, 1, 1],
  getset: [3, ['write', 'denyoom'], 1, 1, 1],
  hdel: [-3, ['write', 'fast'], 1, 1, 1],
  hexists: [3, ['readonly', 'fast'], 1, 1, 1],
  hget: [3, ['readonly', 'fast'], 1, 1, 1],
  hgetall: [2, ['readonly'], 1, 1, 1],
  hincrby: [4, ['write', 'denyoom', 'fast'], 1, 1, 1],
  hincrbyfloat: [4, ['write', 'denyoom', 'fast'], 1, 1, 1],
  hkeys: [2, ['readonly', 'sort_for_script'], 1, 1, 1],
  hlen: [2, ['readonly', 'fast'], 1, 1, 1],
  hmget: [-3, ['readonly'], 1, 1, 1],
  hmset: [-4, ['write', 'denyoom'], 1, 1, 1],
  'host:': [-1, ['loading', 'stale'], 0, 0, 0],
  hscan: [-3, ['readonly', 'random'], 1, 1, 1],
  hset: [4, ['write', 'denyoom', 'fast'], 1, 1, 1],
  hsetnx: [4, ['write', 'denyoom', 'fast'], 1, 1, 1],
  hstrlen: [3, ['readonly', 'fast'], 1, 1, 1],
  hvals: [2, ['readonly', 'sort_for_script'], 1, 1, 1],
  incr: [2, ['write', 'denyoom', 'fast'], 1, 1, 1],
  incrby: [3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  incrbyfloat: [3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  info: [-1, ['loading', 'stale'], 0, 0, 0],
  keys: [2, ['readonly', 'sort_for_script'], 0, 0, 0],
  lastsave: [1, ['random', 'fast'], 0, 0, 0],
  latency: [-2, ['admin', 'noscript', 'loading', 'stale'], 0, 0, 0],
  lindex: [3, ['readonly'], 1, 1, 1],
  linsert: [5, ['write', 'denyoom'], 1, 1, 1],
  llen: [2, ['readonly', 'fast'], 1, 1, 1],
  lpop: [2, ['write', 'fast'], 1, 1, 1],
  lpush: [-3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  lpushx: [3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  lrange: [4, ['readonly'], 1, 1, 1],
  lrem: [4, ['write'], 1, 1, 1],
  lset: [4, ['write', 'denyoom'], 1, 1, 1],
  ltrim: [4, ['write'], 1, 1, 1],
  memory: [-2, ['readonly'], 0, 0, 0],
  mget: [-2, ['readonly'], 1, -1, 1],
  migrate: [-6, ['write', 'movablekeys'], 0, 0, 0],
  module: [-2, ['admin', 'noscript'], 1, 1, 1],
  monitor: [1, ['admin', 'noscript'], 0, 0, 0],
  move: [3, ['write', 'fast'], 1, 1, 1],
  mset: [-3, ['write', 'denyoom'], 1, -1, 2],
  msetnx: [-3, ['write', 'denyoom'], 1, -1, 2],
  multi: [1, ['noscript', 'fast'], 0, 0, 0],
  object: [3, ['readonly'], 2, 2, 2],
  persist: [2, ['write', 'fast'], 1, 1, 1],
  pexpire: [3, ['write', 'fast'], 1, 1, 1],
  pexpireat: [3, ['write', 'fast'], 1, 1, 1],
  pfadd: [-2, ['write', 'denyoom', 'fast'], 1, 1, 1],
  pfcount: [-2, ['readonly'], 1, -1, 1],
  pfdebug: [-3, ['write'], 0, 0, 0],
  pfmerge: [-2, ['write', 'denyoom'], 1, -1, 1],
  pfselftest: [1, ['admin'], 0, 0, 0],
  ping: [-1, ['stale', 'fast'], 0, 0, 0],
  post: [-1, ['loading', 'stale'], 0, 0, 0],
  psetex: [4, ['write', 'denyoom'], 1, 1, 1],
  psubscribe: [-2, ['pubsub', 'noscript', 'loading', 'stale'], 0, 0, 0],
  psync: [3, ['readonly', 'admin', 'noscript'], 0, 0, 0],
  pttl: [2, ['readonly', 'fast'], 1, 1, 1],
  publish: [3, ['pubsub', 'loading', 'stale', 'fast'], 0, 0, 0],
  pubsub: [-2, ['pubsub', 'random', 'loading', 'stale'], 0, 0, 0],
  punsubscribe: [-1, ['pubsub', 'noscript', 'loading', 'stale'], 0, 0, 0],
  randomkey: [1, ['readonly', 'random'], 0, 0, 0],
  readonly: [1, ['fast'], 0, 0, 0],
  readwrite: [1, ['fast'], 0, 0, 0],
  rename: [3, ['write'], 1, 2, 1],
  renamenx: [3, ['write', 'fast'], 1, 2, 1],
  replconf: [-1, ['admin', 'noscript', 'loading', 'stale'], 0, 0, 0],
  restore: [-4, ['write', 'denyoom'], 1, 1, 1],
  'restore-asking': [-4, ['write', 'denyoom', 'asking'], 1, 1, 1],
  role: [1, ['noscript', 'loading', 'stale'], 0, 0, 0],
  rpop: [2, ['write', 'fast'], 1, 1, 1],
  rpoplpush: [3, ['write', 'denyoom'], 1, 2, 1],
  rpush: [-3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  rpushx: [3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  sadd: [-3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  save: [1, ['admin', 'noscript'], 0, 0, 0],
  scan: [-2, ['readonly', 'random'], 0, 0, 0],
  scard: [2, ['readonly', 'fast'], 1, 1, 1],
  script: [-2, ['noscript'], 0, 0, 0],
  sdiff: [-2, ['readonly', 'sort_for_script'], 1, -1, 1],
  sdiffstore: [-3, ['write', 'denyoom'], 1, -1, 1],
  select: [2, ['loading', 'fast'], 0, 0, 0],
  set: [-3, ['write', 'denyoom'], 1, 1, 1],
  setbit: [4, ['write', 'denyoom'], 1, 1, 1],
  setex: [4, ['write', 'denyoom'], 1, 1, 1],
  setnx: [3, ['write', 'denyoom', 'fast'], 1, 1, 1],
  setrange: [4, ['write', 'denyoom'], 1, 1, 1],
  shutdown: [-1, ['admin', 'loading', 'stale'], 0, 0, 0],
  sinter: [-2, ['readonly', 'sort_for_script'], 1, -1, 1],
  sinterstore: [-3, ['write', 'denyoom'], 1, -1, 1],
  sismember: [3, ['readonly', 'fast'], 1, 1, 1],
  slaveof: [3, ['admin', 'noscript', 'stale'], 0, 0, 0],
  slowlog: [-2, ['admin'], 0, 0, 0],
  smembers: [2, ['readonly', 'sort_for_script'], 1, 1, 1],
  smove: [4, ['write', 'fast'], 1, 2, 1],
  sort: [-2, ['write', 'denyoom', 'movablekeys'], 1, 1, 1],
  spop: [-2, ['write', 'noscript', 'random', 'fast'], 1, 1, 1],
  srandmember: [-2, ['readonly', 'random'], 1, 1, 1],
  srem: [-3, ['write', 'fast'], 1, 1, 1],
  sscan: [-3, ['readonly', 'random'], 1, 1, 1],
  strlen: [2, ['readonly', 'fast'], 1, 1, 1],
  subscribe: [-2, ['pubsub', 'noscript', 'loading', 'stale'], 0, 0, 0],
  substr: [4, ['readonly'], 1, 1, 1],
  sunion: [-2, ['readonly', 'sort_for_script'], 1, -1, 1],
  sunionstore: [-3, ['write', 'denyoom'], 1, -1, 1],
  swapdb: [3, ['write', 'fast'], 0, 0, 0],
  sync: [1, ['readonly', 'admin', 'noscript'], 0, 0, 0],
  time: [1, ['random', 'fast'], 0, 0, 0],
  touch: [-2, ['readonly', 'fast'], 1, 1, 1],
  ttl: [2, ['readonly', 'fast'], 1, 1, 1],
  type: [2, ['readonly', 'fast'], 1, 1, 1],
  unlink: [-2, ['write', 'fast'], 1, -1, 1],
  unsubscribe: [-1, ['pubsub', 'noscript', 'loading', 'stale'], 0, 0, 0],
  unwatch: [1, ['noscript', 'fast'], 0, 0, 0],
  wait: [3, ['noscript'], 0, 0, 0],
  watch: [-2, ['noscript', 'fast'], 1, -1, 1],
  zadd: [-4, ['write', 'denyoom', 'fast'], 1, 1, 1],
  zcard: [2, ['readonly', 'fast'], 1, 1, 1],
  zcount: [4, ['readonly', 'fast'], 1, 1, 1],
  zincrby: [4, ['write', 'denyoom', 'fast'], 1, 1, 1],
  zinterstore: [-4, ['write', 'denyoom', 'movablekeys'], 0, 0, 0],
  zlexcount: [4, ['readonly', 'fast'], 1, 1, 1],
  zrange: [-4, ['readonly'], 1, 1, 1],
  zrangebylex: [-4, ['readonly'], 1, 1, 1],
  zrangebyscore: [-4, ['readonly'], 1, 1, 1],
  zrank: [3, ['readonly', 'fast'], 1, 1, 1],
  zrem: [-3, ['write', 'fast'], 1, 1, 1],
  zremrangebylex: [4, ['write'], 1, 1, 1],
  zremrangebyrank: [4, ['write'], 1, 1, 1],
  zremrangebyscore: [4, ['write'], 1, 1, 1],
  zrevrange: [-4, ['readonly'], 1, 1, 1],
  zrevrangebylex: [-4, ['readonly'], 1, 1, 1],
  zrevrangebyscore: [-4, ['readonly'], 1, 1, 1],
  zrevrank: [3, ['readonly', 'fast'], 1, 1, 1],
  zscan: [-3, ['readonly', 'random'], 1, 1, 1],
  zscore: [3, ['readonly', 'fast'], 1, 1, 1],
  zunionstore: [-4, ['write', 'denyoom', 'movablekeys'], 0, 0, 0]
}

// fake QUIT command info~
commandsInfo.quit = [1, ['readonly', 'noscript'], 0, 0, 0]

// fake evalauto command info~
commandsInfo.evalauto = [-3, ['noscript'], 3, 3, 1]

// no test, no documents
// 'latency', 'pfdebug', 'pfselftest', 'psync', 'replconf', 'substr', 'wait', 'readonly',
// 'readwrite', 'asking', 'cluster', 'restore-asking'

const commands = Object.keys(commandsInfo)

exports.initCommands = function (proto) {
  proto.clientCommands = commands

  proto.clientCalcSlot = function (reqArray) {
    let info = commandsInfo[reqArray[0]]
    if (!info || reqArray.length === 1 || (info[2] === 0 && info[0] !== 1)) return null
    // if command have no argument but user provide one, use the argument to calcSlot
    // it is useful in cluster for `multi`, `exec`, `discard`, `unwatch` and so on
    let keyIndex = info[2] || 1
    // Only calc first key, user should ensure that all keys are in a same node.
    let slot = calcSlot(reqArray[keyIndex])
    if (info[0] === 1) reqArray.length = 1
    return slot
  }

  for (let command of commands) {
    proto[command] = function () {
      return sendCommand(this, command, adjustArgs(arguments))
    }
  }

  /* overrides */

  // Parse the reply from INFO into a hash.
  proto.info = function () {
    return sendCommand(this, 'info', adjustArgs(arguments), 0, formatInfo)
  }

  // Set the client's database property to the database number on SELECT.
  proto.select = function (database) {
    return sendCommand(this, 'select', [database], 0, function (reply) {
      this._redisState.database = +database
      return reply
    })
  }

  // Optionally accept a hash as the only argument to MSET.
  proto.mset = function (hash) {
    return sendCommand(this, 'mset', isObject(hash) ? toArray(hash, []) : adjustArgs(arguments))
  }

  // Optionally accept a hash as the only argument to MSETNX.
  proto.msetnx = function (hash) {
    return sendCommand(this, 'msetnx', isObject(hash) ? toArray(hash, []) : adjustArgs(arguments))
  }

  // Optionally accept a hash as the first argument to HMSET after the key.
  proto.hmset = function (key, hash) {
    return sendCommand(this, 'hmset', isObject(hash) ? toArray(hash, [key]) : adjustArgs(arguments))
  }

  // Make a hash from the result of HGETALL.
  proto.hgetall = function () {
    return sendCommand(this, 'hgetall', adjustArgs(arguments), 0, toHash)
  }

  proto.pubsub = function () {
    let args = adjustArgs(arguments)
    return sendCommand(this, 'pubsub', args, 0, function (res) {
      if (args[0].toLowerCase() === 'numsub') res = toHash(res)
      return res
    })
  }

  proto.monitor = function (hashKey) {
    let args = adjustArgs(arguments)
    if (hashKey || !this._redisState.clusterMode) {
      return sendCommand(this, 'monitor', args)
    }

    // monit all nodes in cluster mode
    let tasks = []
    for (let key of Object.keys(this._redisState.pool)) {
      let connection = this._redisState.pool[key]
      if (connection.monitorMode) return
      tasks.push(connection.sendCommand('monitor', args))
    }

    return thunk.all.call(this, tasks)
  }

  /**
   * It combine `eval` and `evalsha` commands: accept a sript, load script to server
   * evaluate it through `evalsha`.
   *
   * Important feature: It will pre-position on redis cluster
   * @return thunk function
   * @api public
   */

  proto.evalauto = function (script, numkeys, key) {
    let args = tool.slice(adjustArgs(arguments))
    script = String(args[0]).trim()

    return thunk.call(this, function (callback) {
      this.clientReady(function () {
        let slot = args.length < 3 ? null : calcSlot(args[2])
        let connection = this._redisState.getConnection(slot)
        if (connection instanceof Error) throw connection

        if (!connection.evalshaT[script]) {
          connection.evalshaT[script] = thunk.persist(connection.sendCommand('script', ['load', script]))
        }
        return connection.evalshaT[script](function (err, sha) {
          if (err) throw err
          args[0] = sha
          return connection.sendCommand('evalsha', args)
        })
      })(callback)
    })
  }

  for (let command of ['psubscribe', 'punsubscribe', 'subscribe', 'unsubscribe']) {
    proto[command] = function () {
      let args = adjustArgs(arguments)
      return sendCommand(this, command, args, args.length ? (args.length - 1) : 0)
    }
  }

  for (let command of commands) {
    proto[command.toUpperCase()] = proto[command]
  }
}

function isObject (obj) {
  return typeof obj === 'object' && !Array.isArray(obj)
}

function adjustArgs (args) {
  return Array.isArray(args[0]) ? args[0] : args
}

function toArray (hash, array) {
  for (let key of Object.keys(hash)) {
    array.push(key, hash[key])
  }
  return array
}

function toHash (array) {
  let hash = {}

  for (let i = 0, len = array.length; i < len; i += 2) {
    hash[array[i]] = array[i + 1]
  }

  return hash
}

function formatInfo (info) {
  let hash = {}

  for (let line of info.toString().split('\r\n')) {
    let index = line.indexOf(':')

    if (index === -1) continue
    let name = line.slice(0, index)
    hash[name] = line.slice(index + 1)
  }

  return hash
}
