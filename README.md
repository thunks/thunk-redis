thunk-redis
==========
A thunk/promise-based redis client with pipelining and cluster.

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Talk topic][talk-image]][talk-url]

## [thunks](https://github.com/thunks/thunks)

### [v0.6.x](https://github.com/thunks/thunk-redis) Stable, support Redis v2.8.x
### [v0.7.x](https://github.com/thunks/thunk-redis/tree/cluster) unstable, support for Redis Cluster(v3.0.0).


## Demo([examples](https://github.com/zensh/thunk-redis/blob/master/examples))

**default thunk API:**

```js
var redis = require('thunk-redis');
var client = redis.createClient({
  database: 0
});

client.on('connect', function() {
  console.log('redis connected!');
});

client.info('server')(function(error, res) {
  console.log('redis server info:', res);
  return this.dbsize();
})(function(error, res) {
  console.log('surrent database size:', res);
  return this.select(0);
})(function(error, res) {
  console.log('select database 0:', res);
  return this.quit();
})(function(error, res) {
  console.log('redis client quit:', res);
});
```

**use promise API:**
```js
var redis = require('thunk-redis');
var client = redis.createClient({
  database: 1,
  usePromise: true
});

client.on('connect', function() {
  console.log('redis connected!');
});

client
  .info('server')
  .then(function(res) {
    console.log('redis server info:', res);
    return client.dbsize();
  })
  .then(function(res) {
    console.log('surrent database size:', res);
    return client.select(0);
  })
  .then(function(res) {
    console.log('select database 0:', res);
    return client.quit();
  })
  .then(function(res) {
    console.log('redis client quit:', res);
  });
```

**support generator in thunk API:**
```js
var redis = require('thunk-redis');
var client = redis.createClient();

client.select(1)(function*(error, res) {
  console.log(error, res);

  yield this.set('foo', 'bar');
  yield this.set('bar', 'baz');

  console.log('foo -> %s', yield this.get('foo'));
  console.log('bar -> %s', yield this.get('bar'));

  var user = {
    id: 'u001',
    name: 'jay',
    age: 24
  };
  // transaction, it is different from node_redis!
  yield [
    this.multi(),
    this.set(user.id, JSON.stringify(user)),
    this.zadd('userAge', user.age, user.id),
    this.pfadd('ageLog', user.age),
    this.exec()
  ];

  return this.quit();
})(function(error, res) {
  console.log(error, res);
});
```

## Benchmark

```js
➜  thunk-redis git:(master) ✗ node --harmony benchmark/index.js
redis(N):node_redis
OK
redis(T):thunk-redis
OK
Start...


redis(N): PING 49358 ops/sec 100%
redis(T): PING 54495 ops/sec 110.4%

redis(N): SET small string 39062 ops/sec 100%
redis(T): SET small string 44523 ops/sec 114.0%

redis(N): GET small string 43859 ops/sec 100%
redis(T): GET small string 47687 ops/sec 108.7%

redis(N): SET long string 28320 ops/sec 100%
redis(T): SET long string 35323 ops/sec 124.7%

redis(N): GET long string 30432 ops/sec 100%
redis(T): GET long string 26645 ops/sec 87.6%

redis(N): INCR 46061 ops/sec 100%
redis(T): INCR 48756 ops/sec 105.9%

redis(N): LPUSH 39824 ops/sec 100%
redis(T): LPUSH 45289 ops/sec 113.7%

redis(N): LRANGE 100 8322 ops/sec 100%
redis(T): LRANGE 100 10094 ops/sec 121.3%
```

## Installation

**Node.js:**

```bash
npm install thunk-redis
```

## API ([More](https://github.com/zensh/thunk-redis/blob/master/API.md))

1. redis.createClient([port], [host], [options])
2. redis.createClient([path], [options])
3. redis.createClient([netOptionsArray], [options])
4. redis.log([...])
5. redis.calcSlot(str)

### redis.log

Helper tool, print result or error stack.

```js
var client = redis.createClient();
client.info()(redis.log);
```

### redis.createClient

```js
var client1 = redis.createClient();
var client2 = redis.createClient({database: 2});
var client3 = redis.createClient(6379, {database: 2});
var client4 = redis.createClient(6379, '127.0.0.1', {database: 2});
var client5 = redis.createClient('/tmp/redis.sock');
var client6 = redis.createClient('/tmp/redis.sock', {database: 2});
```

**redis cluster:**
```js
// assume cluster: '127.0.0.1:7000', '127.0.0.1:7001', '127.0.0.1:7002', ...
var client1 = redis.createClient(7000, options);
var client2 = redis.createClient([7000, 7001, 7002], options);
var client3 = redis.createClient({host: '127.0.0.1', port: 7000}, options);
var client4 = redis.createClient([
  {host: '127.0.0.1', port: 7000},
  {host: '127.0.0.1', port: 7001},
  {host: '127.0.0.1', port: 7002},
], options);
// All of above will work, it will find redis nodes by self.

// Create a client in cluster servers without cluster mode:
var clientX = redis.createClient(7000, {clusterMode: false});
```

- `options.authPass`: *Optional*, Type: `String`, Default: `''`.

- `options.database`: *Optional*, Type: `Number`, Default: `0`.

- `options.debugMode`: *Optional*, Type: `Boolean`, Default: `false`.

    Print request data and response data.

- `options.clusterMode`: *Optional*, Type: `Boolean`, Default: auto.

    If `false`, client will disable cluster.

- `options.returnBuffers`: *Optional*, Type: `Boolean`, Default: `false`.

- `options.usePromise`: *Optional*, Type: `Boolean` or `Promise` constructor, Default: `false`.

    Export promise commands API.

    **Use default Promise:**
    ```js
    var redis = require('thunk-redis');
    var client = redis.createClient({
      usePromise: true
    });
    ```

    **Use bluebird:**
    ```js
    var redis = require('thunk-redis');
    var Bluebird = require('bluebird');
    var client = redis.createClient({
      usePromise: Bluebird
    });
    ```

- `options.noDelay`: *Optional*, Type: `Boolean`, Default: `true`.

    Disables the Nagle algorithm. By default TCP connections use the Nagle algorithm, they buffer data before sending it off. Setting true for noDelay will immediately fire off data each time socket.write() is called.

- `options.keepAlive`: *Optional*, Type: `Boolean`, Default: `true`.

    Enable/disable keep-alive functionality, and optionally set the initial delay before the first keepalive probe is sent on an idle socket.

- `options.timeout`: *Optional*, Type: `Number`, Default: `0`.

    Sets the socket to timeout after timeout milliseconds of inactivity on the socket. If timeout is 0, then the existing idle timeout is disabled.

    When an idle timeout is triggered the socket will receive a 'timeout' event but the connection will not be severed.

- `options.retryDelay`: *Optional*, Type: `Number`, Default: `5000`.

- `options.maxAttempts`: *Optional*, Type: `Number`, Default: `5`.

- `options.commandsHighWater`: *Optional*, Type: `Number`, Default: `10000`.

## Who's using

+ Teambition community: https://bbs.teambition.com/


[npm-url]: https://npmjs.org/package/thunk-redis
[npm-image]: http://img.shields.io/npm/v/thunk-redis.svg

[travis-url]: https://travis-ci.org/thunks/thunk-redis
[travis-image]: http://img.shields.io/travis/thunks/thunk-redis.svg

[talk-url]: https://guest.talk.ai/rooms/d1ccbf802n
[talk-image]: https://img.shields.io/talk/t/d1ccbf802n.svg
