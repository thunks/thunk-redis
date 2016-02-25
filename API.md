thunk-redis API
=====
A thunk/promise-based redis client, support all redis features.

#### redis.createClient([port], [host], [options])
#### redis.createClient([addressArray], [options])

+ port: `Number`, default: `6379`;
+ host: `String`, default: `'localhost'`;
+ options: `Object`, default: `{}`;

Create a redis client, return the client.

```js
var client1 = redis.createClient();
var client2 = redis.createClient({database: 2});
var client3 = redis.createClient(6379, {database: 2});
var client4 = redis.createClient('127.0.0.1:6379', {database: 2});
var client5 = redis.createClient(6379, '127.0.0.1', {database: 2});
// connect to 2 nodes
var client6 = redis.createClient([6379, 6380])
var client7 = redis.createClient(['127.0.0.1:6379', '127.0.0.1:6380']) // IPv4
var client8 = redis.createClient(['[::1]:6379', '[::1]:6380']) // IPv6
```

#### redis.log([...])

```js
var client = redis.createClient();
client.info()(redis.log);
```

#### redis.calcSlot(str)

```js
redis.calcSlot('123456789'); // => 12739
redis.calcSlot(118); // => 13162
```

## Events

#### client.on('close', function () {})
#### client.on('connect', function () {})
#### client.on('connection', function (connection) {})
#### client.on('warn', function (error) {})
#### client.on('error', function (error) {})
#### client.on('reconnecting', function (message) {})

#### client.on('subscribe', function (pattern, n) {})
#### client.on('unsubscribe', function (pattern, n) {})
#### client.on('psubscribe', function (pattern, n) {})
#### client.on('punsubscribe', function (pattern, n) {})
#### client.on('message', function (channel, message) {})
#### client.on('pmessage', function (pattern, channel, message) {})
#### client.on('monitor', function (message) {})

## Others


#### client.clientConnect()
#### client.clientEnd()
#### client.clientUnref()
#### client.clientState()

#### client.evalauto(script, numkeys, key, [key ...], arg, [arg ...])

#### client.clientCommands

## Commands

### Keys
#### client.del(key, [key ...]) | client.del([key1, key2, ...])
#### client.dump(key)
#### client.exists(key)
#### client.expire(key, seconds)
#### client.expireat(key, timestamp)
#### client.keys(pattern)
#### client.migrate(host, port, key, db, timeout, [COPY], [REPLASE])
#### client.move(key, db)
#### client.object(subcommand, [key, [key ...]])
#### client.persist(key)
#### client.pexpire(key, milliseconds)
#### client.pexpireat(key, ms-timestamp)
#### client.pttl(key)
#### client.randomkey()
#### client.rename(key, newkey)
#### client.renamenx(key, newkey)
#### client.restore(key, ttl, serialized-value)
#### client.sort(key, [BY pattern], [LIMIT offset count], [GET pattern [GET pattern ...]], [ASC | DESC], [ALPHA], [STORE destination])
#### client.ttl(key)
#### client.type(key)
#### client.scan(cursor, [MATCH pattern], [COUNT count])

### Strings
#### client.append(key, value)
#### client.bitcount(key, [start], [end])
#### client.bitop(operation, destkey, key, [key ...])
#### client.bitpos(key, bit, [start], [end])
#### client.decr(key)
#### client.decrby(key, decrement)
#### client.get(key)
#### client.getbit(key, offset)
#### client.getrange(key, start, end)
#### client.getset(key, value)
#### client.incr(key)
#### client.incrby(key, increment)
#### client.incrbyfloat(key, increment)
#### client.mget(key, [key ...]) | client.mget([key1, key2, ...])
#### client.mset(key, value, [key, value ...]) | client.mset(object)
#### client.msetnx(key, value, [key, value ...]) | client.msetnx(object)
#### client.psetex(key, milliseconds, value)
#### client.set(key, value, [EX seconds], [PX milliseconds], [NX|XX])
#### client.setbit(key, offset, value)
#### client.setex(key, seconds, value)
#### client.setnx(key, value)
#### client.setrange(key, offset, value)
#### client.strlen(key)

### Hashes
#### client.hdel(key, field, [field ...])
#### client.hexists(key, field)
#### client.hget(key, field)
#### client.hgetall(key)
#### client.hincrby(key, field, increment)
#### client.hincrbyfloat(key, field, increment)
#### client.hkeys(key)
#### client.hlen(key)
#### client.hmget(key, field, [field ...])
#### client.hmset(key, field, value, [field, value ...]) | client.hmset(key, object)
#### client.hset(key, field, value)
#### client.hsetnx(key, field, value)
#### client.hvals(key)
#### client.hscan(key, cursor, [MATCH pattern], [COUNT count])

### Lists
#### client.blpop(key, [key ...], timeout)
#### client.brpop(key, [key ...], timeout)
#### client.brpoplpush(source, destination, timeout)
#### client.lindex(key, index)
#### client.linsert(key, BEFORE|AFTER, pivot, value)
#### client.llen(key)
#### client.lpop(key)
#### client.lpush(key, value, [value ...])
#### client.lpushx(key, value)
#### client.lrange(key, start, stop)
#### client.lrem(key, count, value)
#### client.lset(key, index, value)
#### client.ltrim(key, start, stop)
#### client.rpop(key)
#### client.rpoplpush(source, destination)
#### client.rpush(key, value, [value ...])
#### client.rpushx(key, value)

### Sets
#### client.sadd(key, member, [member ...])
#### client.scard(key)
#### client.sdiff(key, [key ...])
#### client.sdiffstore(destination, key, [key ...])
#### client.sinter(key, [key ...])
#### client.sinterstore(destination, key, [key ...])
#### client.sismember(key, member)
#### client.smembers(key)
#### client.smove(source, destination, member)
#### client.spop(key)
#### client.srandmember(key, [count])
#### client.srem(key, member, [member ...])
#### client.sunion(key, [key ...])
#### client.sunionstore(destination, key, [key ...])
#### client.sscan(key, cursor, [MATCH, pattern], [COUNT, count])

### Sorted Sets
#### client.zadd(key, score, member, [score, member ...])
#### client.zcard(key)
#### client.zcount(key, min, max)
#### client.zincrby(key, increment, member)
#### client.zinterstore(destination, numkeys, key, [key ...], [WEIGHTS, weight, [weight ...]], [AGGREGATE, SUM|MIN|MAX])
#### client.zlexcount(key, min, max)
#### client.zrange(key, start, stop, [WITHSCORES])
#### client.zrangebylex(key, min, max, [LIMIT, offset, count])
#### client.zrevrangebylex(key, min, max, [LIMIT, offset, count])
#### client.zrangebyscore(key, min, max, [WITHSCORES], [LIMIT, offset, count])
#### client.zrank(key, member)
#### client.zrem(key, member, [member ...])
#### client.zremrangebylex(key, min, max)
#### client.zremrangebyrank(key, start, stop)
#### client.zremrangebyscore(key, min, max)
#### client.zrevrange(key, start, stop, [WITHSCORES])
#### client.zrevrangebyscore(key, max, min, [WITHSCORES], [LIMIT, offset, count])
#### client.zrevrank(key, member)
#### client.zscore(key, member)
#### client.zunionstore(destination, numkeys, key, [key ...], [WEIGHTS, weight, [weight ...]], [AGGREGATE, SUM|MIN|MAX])
#### client.zscan(key, cursor, [MATCH, pattern] [COUNT, count])

### HyperLog
#### client.pfadd(key, element, [element ...])
#### client.pfcount(key, [key ...])
#### client.pfmerge(destkey, sourcekey, [sourcekey ...])

### Pub/Sub
#### client.psubscribe(pattern, [pattern ...])
#### client.publish(channel, message)
#### client.pubsub(subcommand, [argument, [argument ...])
#### client.punsubscribe(pattern [pattern ...])
#### client.subscribe(channel, [channel ...])
#### client.unsubscribe([channel, [channel ...]])

### Transactions
#### client.discard()
#### client.exec()
#### client.multi()
#### client.unwatch()
#### client.watch(key, [key ...])

### Scripting
#### client.eval(script, numkeys, key, [key ...], arg, [arg ...])
#### client.evalsha(sha1, numkeys, key, [key ...], arg, [arg ...])
#### client.evalauto(script, numkeys, key, [key ...], arg, [arg ...]) [custom command]
#### client.script('EXISTS', script, [script ...])
#### client.script('FLUSH')
#### client.script('KILL')
#### client.script('LOAD', script)

### Connection
#### client.auth(password)
#### client.echo(message)
#### client.ping()
#### client.quit()
#### client.select(index)

### Server
#### client.bgrewriteaof()
#### client.bgsave()
#### client.client('KILL', [ip:port], [ID, client-id], [TYPE, normal|slave|pubsub], [ADDR, ip:port], [SKIPME, yes/no])
#### client.client('LIST')
#### client.client('GETNAME')
#### client.client('PAUSE', timeout)
#### client.client('SETNAME', connection-name)
#### client.cluster('SLOTS')
#### client.command()
#### client.command('COUNT')
#### client.command('GETKEYS')
#### client.command('INFO', command-name, [command-name ...])
#### client.config('GET', parameter)
#### client.config('REWRITE')
#### client.config('SET', parameter, value)
#### client.config('RESETSTAT')
#### client.dbsize()
#### client.debug('OBJECT', key)
#### client.debug('SEGFAULT')
#### client.flushall()
#### client.flushdb()
#### client.info([section])
#### client.lastsave()
#### client.monitor()
#### client.role()
#### client.save()
#### client.shutdown([NOSAVE], [SAVE])
#### client.slaveof(host, port)
#### client.slowlog(subcommand, [argument])
#### client.sync()
#### client.time()
