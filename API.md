thunk-redis API v0.1.0 [![Build Status](https://travis-ci.org/zensh/thunk-redis.png?branch=master)](https://travis-ci.org/zensh/thunk-redis)
===========
A thunk-based redis client.

## Initial

```js
var redis = require('thunk-redis');
```

### redis.createClient([port], [host], [options])
### redis.createClient([path], [options])

+ port: `Number`, default: `6379`;
+ host: `String`, default: `'localhost'`;
+ options: `Object`, default: `{}`;
+ path: `String`, default: `undefined`;

Create a redis client, return the client.

```js
var client1 = redis.createClient();
var client2 = redis.createClient({database: 2});
var client3 = redis.createClient(6379, {database: 2});
var client4 = redis.createClient(6379, '127.0.0.1', {database: 2});
var client5 = redis.createClient('/tmp/redis.sock');
var client6 = redis.createClient('/tmp/redis.sock', {database: 2});
```

### redis.log([...])

```js
var client = redis.createClient();
client.info()(redis.log);
```

## Events

```js
var client = redis.createClient();
```

### client.on('error', function (error) {})
### client.on('connect', function () {})
### client.on('close', function () {})
### client.on('end', function () {})
### client.on('drain', function () {})
### client.on('timeout', function () {})
### client.on('drain', function () {})
### client.on('all', function (e) {})

## Commands

```js
var client = redis.createClient();
```

### Key
### client.del(key, [key ...])
### client.dump(key)
### client.exists(key)
### client.expire(key, seconds)
### client.expireat(key, timestamp)
### client.keys(pattern)
### client.migrate(host, port, key, db, timeout, [COPY], [REPLASE])
### client.move(key, db)
### client.object(subcommand, key)
### client.persist(key)
### client.pexpire(key, milliseconds)
### client.pexpireat(key, ms-timestamp)
### client.pttl(key)
### client.randomkey()
### client.rename(key, newkey)
### client.renamenx(key, newkey)
### client.restore(key, ttl, serialized-value, [REPLACE])
### client.sort(key, [BY pattern], [LIMIT offset count], [GET pattern [GET pattern ...]], [ASC | DESC], [ALPHA], [STORE destination])
### client.ttl(key)
### client.type(key)
### client.scan(cursor, [MATCH pattern], [COUNT count])

### String
### client.append(key, value)
### client.bitcount(key, [start], [end])
### client.bitop(operation, destkey, key, [key ...])
### client.decr(key)
### client.decrby(key, decrement)
### client.get(key)
### client.getbit(key, offset)
### client.getrange(key, start, end)
### client.getset(key, value)
### client.incr(key)
### client.incrby(key, increment)
### client.incrbyfloat(key, increment)
### client.mget(key, [key ...])
### client.mset(key, value, [key value ...])
### client.mset(object)
### client.msetnx(key, value, [key value ...])
### client.msetnx(object)
### client.psetex(key, milliseconds, value)
### client.set(key, value, [EX seconds], [PX milliseconds], [NX|XX])
### client.setbit(key, offset, value)
### client.setex(key, seconds, value)
### client.setnx(key, value)
### client.setrange(key, offset, value)
### client.strlen(key)

### Hash
### client.hdel
### client.hexists
### client.hget
### client.hgetall
### client.hincrby
### client.hincrbyfloat
### client.hkeys
### client.hlen
### client.hmget
### client.hmset
### client.hset
### client.hsetnx
### client.hvals
### client.hscan

### List
### client.blpop
### client.brpop
### client.brpoplpush
### client.lindex
### client.linsert
### client.llen
### client.lpop
### client.lpush
### client.lpushx
### client.lrange
### client.lrem
### client.lset
### client.ltrim
### client.rpop
### client.rpoplpush
### client.rpush
### client.rpushx

### Set
### client.sadd
### client.scard
### client.sdiff
### client.sdiffstore
### client.sinter
### client.sinterstore
### client.sismember
### client.smembers
### client.smove
### client.spop
### client.srandmember
### client.srem
### client.sunion
### client.sunionstore
### client.sscan

### Sorted Set
### client.zadd
### client.zcard
### client.zcount
### client.zincrby
### client.zinterstore
### client.zrange
### client.zrangebyscore
### client.zrank
### client.zrem
### client.zremrangebyrank
### client.zremrangebyscore
### client.zrevrange
### client.zrevrangebyscore
### client.zrevrank
### client.zscore
### client.zunionstore
### client.zsan

### Pubsub
### client.psubscribe
### client.publish
### client.pubsub
### client.punsubscribe
### client.subscribe
### client.unsubscribe

### Transaction
### client.discard
### client.exec
### client.multi
### client.unwatch
### client.watch

### Script
### client.eval
### client.evalsha
### client.script

### Connection
### client.auth
### client.echo
### client.ping
### client.quit
### client.select

### Server
### client.bgrewriteaof
### client.bgsave
### client.client
### client.config
### client.dbsize
### client.debug
### client.flushall
### client.flushdb
### client.info
### client.lastsave
### client.monitor
### client.psync
### client.save
### client.shutdown
### client.slaveof
### client.slowlog
### client.sync
### client.time

## Others

```js
var client = redis.createClient();
```

### client.unref()
### client.emit()
### client.end()
### client.options
### client.status


