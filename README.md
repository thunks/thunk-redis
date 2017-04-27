# thunk-redis

The fastest thunk/promise-based redis client, support all redis features.

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Downloads][downloads-image]][downloads-url]
[![js-standard-style][js-standard-image]][js-standard-url]

## [thunks](https://github.com/thunks/thunks)

## Implementations:

- [thunk-ratelimiter](https://github.com/thunks/thunk-ratelimiter) The fastest abstract rate limiter.
- [timed-queue](https://github.com/teambition/timed-queue) Distributed timed job queue, backed by Redis.

## Demo([examples](https://github.com/zensh/thunk-redis/blob/master/examples))

**https://raw.githubusercontent.com/antirez/redis/4.0/redis.conf**

**Sugest set config `cluster-require-full-coverage` to `no` in redis cluster!**

**default thunk API:**

```js
const redis = require('../index')
const thunk = require('thunks')()
const client = redis.createClient({
  database: 1
})

client.on('connect', function () {
  console.log('redis connected!')
})

client.info('server')(function (error, res) {
  console.log('redis server info:', res)
  return this.dbsize()
})(function (error, res) {
  console.log('current database size:', res)
  // current database size: 0
  return this.select(0)
})(function (error, res) {
  console.log('select database 0:', res)
  // select database 0: OK
  return thunk.all([
    this.multi(),
    this.set('key', 'redis'),
    this.get('key'),
    this.exec()
  ])
})(function (error, res) {
  console.log('transactions:', res)
  // transactions: [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'redis' ] ]
  return this.quit()
})(function (error, res) {
  console.log('redis client quit:', res)
  // redis client quit: OK
})
```

**use promise API:**
```js
const redis = require('../index')
const Promise = require('bluebird')
const client = redis.createClient({
  database: 1,
  usePromise: true
})

client.on('connect', function () {
  console.log('redis connected!')
})

client
  .info('server')
  .then(function (res) {
    console.log('redis server info:', res)
    return client.dbsize()
  })
  .then(function (res) {
    console.log('current database size:', res)
    // current database size: 0
    return client.select(0)
  })
  .then(function (res) {
    console.log('select database 0:', res)
    // select database 0: OK
    return Promise.all([
      client.multi(),
      client.set('key', 'redis'),
      client.get('key'),
      client.exec()
    ])
  })
  .then(function (res) {
    console.log('transactions:', res)
    // transactions: [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'redis' ] ]
    return client.quit()
  })
  .then(function (res) {
    console.log('redis client quit:', res)
    // redis client quit: OK
  })
  .catch(function (err) {
    console.error(err)
  })
```

**support generator in thunk API:**
```js
const redis = require('thunk-redis')
const client = redis.createClient()

client.select(1)(function* (error, res) {
  console.log(error, res)

  yield this.set('foo', 'bar')
  yield this.set('bar', 'baz')

  console.log('foo -> %s', yield this.get('foo'))
  console.log('bar -> %s', yield this.get('bar'))

  var user = {
    id: 'u001',
    name: 'jay',
    age: 24
  }
  // transaction, it is different from node_redis!
  yield [
    this.multi(),
    this.set(user.id, JSON.stringify(user)),
    this.zadd('userAge', user.age, user.id),
    this.pfadd('ageLog', user.age),
    this.exec()
  ]

  return this.quit()
})(function (error, res) {
  console.log(error, res)
})
```

## Benchmark

Details: https://github.com/thunks/thunk-redis/issues/12

## Installation

**Node.js:**

```bash
npm install thunk-redis
```

## API ([More](https://github.com/zensh/thunk-redis/blob/master/API.md))

1. redis.createClient([addressArray], [options])
2. redis.createClient([port], [host], [options])
3. redis.createClient([address], [options])
4. redis.calcSlot(str)
5. redis.log([...])

### redis.log

Helper tool, print result or error stack.

```js
const client = redis.createClient()
client.info()(redis.log)
```

### redis.createClient

```js
const client1 = redis.createClient()
const client2 = redis.createClient({database: 2})
const client3 = redis.createClient(6379, {database: 2})
const client4 = redis.createClient('127.0.0.1:6379', {database: 2})
const client5 = redis.createClient(6379, '127.0.0.1', {database: 2})
// connect to 2 nodes
const client6 = redis.createClient([6379, 6380])
const client7 = redis.createClient(['127.0.0.1:6379', '127.0.0.1:6380']) // IPv4
const client8 = redis.createClient(['[::1]:6379', '[::1]:6380']) // IPv6
```

**redis cluster:**

```js
// assume cluster: '127.0.0.1:7000', '127.0.0.1:7001', '127.0.0.1:7002', ...
const client1 = redis.createClient(7000, options) // will auto find cluster nodes!
const client2 = redis.createClient([7000, 7001, 7002], options)

const client3 = redis.createClient([
  '127.0.0.1:7000',
  '127.0.0.1:7001',
  '127.0.0.1:7002'
], options)

const client4 = redis.createClient([
  {host: '127.0.0.1', port: 7000},
  {host: '127.0.0.1', port: 7001},
  {host: '127.0.0.1', port: 7002},
], options)
// All of above will work, it will find redis nodes by self.

// Create a client in cluster servers without cluster mode:
const clientX = redis.createClient(7000, {clusterMode: false})
```

- `options.onlyMaster`: *Optional*, Type: `Boolean`, Default: `true`.

    In replication mode, thunk-redis will try to connect master node and close slave node.

- `options.authPass`: *Optional*, Type: `String`, Default: `''`.

- `options.database`: *Optional*, Type: `Number`, Default: `0`.

- `options.returnBuffers`: *Optional*, Type: `Boolean`, Default: `false`.

- `options.usePromise`: *Optional*, Type: `Boolean`, Default: `false`.

    Export promise commands API.

    **Use default Promise:**
    ```js
    var redis = require('thunk-redis')
    var client = redis.createClient({
      usePromise: true
    })
    ```

- `options.noDelay`: *Optional*, Type: `Boolean`, Default: `true`.

    Disables the Nagle algorithm. By default TCP connections use the Nagle algorithm, they buffer data before sending it off. Setting true for noDelay will immediately fire off data each time socket.write() is called.

- `options.retryMaxDelay`: *Optional*, Type: `Number`, Default: `5 * 60 * 1000`.

    By default every time the client tries to connect and fails time before reconnection (delay) almost multiply by `1.2`. This delay normally grows infinitely, but setting `retryMaxDelay` limits delay to maximum value, provided in milliseconds.

- `options.maxAttempts`: *Optional*, Type: `Number`, Default: `20`.

    By default client will try reconnecting until connected. Setting `maxAttempts` limits total amount of reconnects.

- `options.pingInterval`: *Optional*, Type: `Number`, Default: `0`.

    How many ms before sending a ping packet. There is no ping packet by default(`0` to disable). If redis server enable `timeout` config, this option will be useful.

- `options.IPMap`: *Optional*, Type: `Object`, Default: `{}`.

    This option use o resolve redis internal IP and external IP problem https://github.com/thunks/thunk-redis/issues/19. Define it like: `{internalIP: externalIP}`, for example:
    ```js
    const cli = redis.createClient([
      '127.0.0.1:7000',
      '127.0.0.1:7001',
      '127.0.0.1:7002',
      '127.0.0.1:7003',
      '127.0.0.1:7004',
      '127.0.0.1:7005'
    ], {
      IPMap: {
        '172.17.0.2:7000': '127.0.0.1:7000',
        '172.17.0.2:7001': '127.0.0.1:7001',
        '172.17.0.2:7002': '127.0.0.1:7002',
        '172.17.0.2:7003': '127.0.0.1:7003',
        '172.17.0.2:7004': '127.0.0.1:7004',
        '172.17.0.2:7005': '127.0.0.1:7005'
      }
    })
    ```

[npm-url]: https://npmjs.org/package/thunk-redis
[npm-image]: http://img.shields.io/npm/v/thunk-redis.svg

[travis-url]: https://travis-ci.org/thunks/thunk-redis
[travis-image]: http://img.shields.io/travis/thunks/thunk-redis.svg

[downloads-url]: https://npmjs.org/package/thunk-redis
[downloads-image]: http://img.shields.io/npm/dm/thunk-redis.svg?style=flat-square

[js-standard-url]: https://github.com/feross/standard
[js-standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat
