thunk-redis
==========
A thunk/promise-based redis client, support all redis features.

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Talk topic][talk-image]][talk-url]

## [thunks](https://github.com/thunks/thunks)

## Demo([examples](https://github.com/zensh/thunk-redis/blob/master/examples))

**https://raw.githubusercontent.com/antirez/redis/3.0/redis.conf**

**Sugest set config `cluster-require-full-coverage` to `no` in redis cluster!**

**cluster transaction:**

```js
var redis = require('../index');
var client = redis.createClient(7000, {debugMode: false});

client.info()(function*() {
  // provide key to `multi` and `exec` for directing to the same node
  var res = yield [
    this.multi('key'),
    this.set('key', 'key'),
    this.get('key'),
    this.exec('key')
  ];
  console.log(res); // [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'key' ] ]

  // Keys hash tags
  res = yield [
    this.multi('hash{tag}'),
    this.set('hash{tag}', 'hash{tag}'),
    this.get('hash{tag}'),
    this.exec('hash{tag}')
  ];
  console.log(res); // [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'hash{tag}' ] ]

})();
```

**default thunk API:**

```js
var redis = require('../index');
var Thunk = require('thunks')();
var client = redis.createClient({
  database: 1
});

client.on('connect', function() {
  console.log('redis connected!');
});

client.info('server')(function(error, res) {
  console.log('redis server info:', res);
  return this.dbsize();
})(function(error, res) {
  console.log('current database size:', res);
  // current database size: 0
  return this.select(0);
})(function(error, res) {
  console.log('select database 0:', res);
  // select database 0: OK
  return Thunk.all([
    this.multi(),
    this.set('key', 'redis'),
    this.get('key'),
    this.exec()
  ]);
})(function(error, res) {
  console.log('transactions:', res);
  // transactions: [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'redis' ] ]
  return this.quit();
})(function(error, res) {
  console.log('redis client quit:', res);
  // redis client quit: OK
});
```

**use promise API:**
```js
'use strict';
/*global */

var redis = require('../index');
var Promise = require('bluebird');
var client = redis.createClient({
  database: 1,
  usePromise: Promise
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
    console.log('current database size:', res);
    // current database size: 0
    return client.select(0);
  })
  .then(function(res) {
    console.log('select database 0:', res);
    // select database 0: OK
    return Promise.all([
      client.multi(),
      client.set('key', 'redis'),
      client.get('key'),
      client.exec()
    ]);
  })
  .then(function(res) {
    console.log('transactions:', res);
    // transactions: [ 'OK', 'QUEUED', 'QUEUED', [ 'OK', 'redis' ] ]
    return client.quit();
  })
  .then(function(res) {
    console.log('redis client quit:', res);
    // redis client quit: OK
  })
  .catch(function(err) {
    console.error(err);
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

1. redis.createClient([addressArray], [options])
2. redis.createClient([port], [host], [options])
3. redis.createClient([address], [options])
4. redis.calcSlot(str)
5. redis.log([...])

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
var client4 = redis.createClient('127.0.0.1:6379', {database: 2});
var client5 = redis.createClient(6379, '127.0.0.1', {database: 2});
```

**redis cluster:**

```js
// assume cluster: '127.0.0.1:7000', '127.0.0.1:7001', '127.0.0.1:7002', ...
var client1 = redis.createClient(7000, options); // will auto find cluster nodes!
var client2 = redis.createClient([7000, 7001, 7002], options);

var client3 = redis.createClient([
  '127.0.0.1:7000',
  '127.0.0.1:7001',
  '127.0.0.1:7002'
], options);

var client4 = redis.createClient([
  {host: '127.0.0.1', port: 7000},
  {host: '127.0.0.1', port: 7001},
  {host: '127.0.0.1', port: 7002},
], options);
// All of above will work, it will find redis nodes by self.

// Create a client in cluster servers without cluster mode:
var clientX = redis.createClient(7000, {clusterMode: false});
```

- `options.handleError`: *Optional*, Type: `Boolean`, Default: `true`.

    Handle client error event.

- `options.authPass`: *Optional*, Type: `String`, Default: `''`.

- `options.database`: *Optional*, Type: `Number`, Default: `0`.

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

- `options.retryMaxDelay`: *Optional*, Type: `Number`, Default: `Infinity`.

    By default every time the client tries to connect and fails time before reconnection (delay) almost multiply by `1.2`. This delay normally grows infinitely, but setting `retryMaxDelay` limits delay to maximum value, provided in milliseconds.

- `options.maxAttempts`: *Optional*, Type: `Number`, Default: `10`.

    By default client will try reconnecting until connected. Setting `maxAttempts` limits total amount of reconnects.

## Debug

Tool: **https://github.com/visionmedia/debug**

Debugs: `redis:resp`, `redis:socket`, `redis:command`

**Debug all:**
```sh
DEBUG=redis:* node examples/demo
```

## Who's using

+ Teambition community: https://bbs.teambition.com/


[npm-url]: https://npmjs.org/package/thunk-redis
[npm-image]: http://img.shields.io/npm/v/thunk-redis.svg

[travis-url]: https://travis-ci.org/thunks/thunk-redis
[travis-image]: http://img.shields.io/travis/thunks/thunk-redis.svg

[talk-url]: https://guest.talk.ai/rooms/d1ccbf802n
[talk-image]: https://img.shields.io/talk/t/d1ccbf802n.svg
