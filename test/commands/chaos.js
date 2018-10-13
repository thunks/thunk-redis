'use strict'

const tman = require('tman')
const assert = require('assert')
const redis = require('../..')

tman.suite('chaos test', function () {
  const client = redis.createClient()
  const clientP = redis.createClient({
    usePromise: true
  })
  const len = 10000
  const tasks = []
  for (let i = 0; i < len; i++) tasks.push(i)

  function getClient () {
    // use thunk API or promise API randomly
    return Math.floor(Math.random() * 10) % 2 ? client : clientP
  }

  tman.it('create 10000 users', function * () {
    assert((yield client.flushall()) === 'OK')
    yield tasks.map((value, index) => createUser('U' + index))
    assert((yield client.zcard('userScore')) === len)

    function createUser (id) {
      const time = Date.now()
      const user = {
        id: id,
        name: 'user_' + id,
        email: id + '@test.com',
        score: 0,
        issues: [],
        createdAt: time,
        updatedAt: time
      }

      return new Promise((resolve, reject) => setTimeout(resolve, Math.floor(Math.random() * 5)))
        .then(() => {
          return Promise.all([
            clientP.multi(),
            clientP.set(id, JSON.stringify(user)),
            clientP.zadd('userScore', user.score, id),
            clientP.exec()
          ])
        })
        .then((result) => assert.deepStrictEqual(result, ['OK', 'QUEUED', 'QUEUED', ['OK', 1]]))
    }
  })

  tman.it('update 10000 users', function * () {
    yield tasks.map(function (value, index) {
      return updateUser('U' + index, Math.floor(Math.random() * 1000))
    })

    assert((yield client.pfcount('scoreLog')) > 5)

    function * updateUser (id, score) {
      const cli = getClient()
      let user = yield cli.get(id)
      user = JSON.parse(user)
      user.score = score
      user.updatedAt = Date.now()
      const result = yield [
        cli.multi(),
        cli.set(id, JSON.stringify(user)),
        cli.zadd('userScore', user.score, id),
        cli.pfadd('scoreLog', Math.floor(score / 100)),
        cli.exec()
      ]
      result.pop()
      assert.deepStrictEqual(result, ['OK', 'QUEUED', 'QUEUED', 'QUEUED'])
    }
  })

  tman.it('create 10000 issues for some users', function * () {
    yield tasks.map(function (value, index) {
      return createIssue('I' + index, 'U' + Math.floor(Math.random() * len))
    })

    assert((yield client.pfcount('scoreLog')) > 5)

    function * createIssue (id, uid) {
      const cli = getClient()
      const time = Date.now()
      const issue = {
        id: id,
        creatorId: uid,
        content: 'issue_' + id,
        createdAt: time,
        updatedAt: time
      }

      const user = JSON.parse(yield cli.get(uid))
      if (!user) {
        console.log(uid, user)
        return
      }
      user.issues.push(issue.id)
      user.score += 100
      user.updatedAt = time

      const result = yield [
        cli.multi(),
        cli.hmset(id, {
          issue: JSON.stringify(issue),
          creator: JSON.stringify({
            id: user.id,
            name: user.name,
            email: user.email
          })
        }),
        cli.set(uid, JSON.stringify(user)),
        cli.zadd('userScore', user.score, uid),
        cli.pfadd('scoreLog', Math.floor(user.score / 100)),
        cli.exec()
      ]
      result.pop()
      assert.deepStrictEqual(result, ['OK', 'QUEUED', 'QUEUED', 'QUEUED', 'QUEUED'])
    }
  })
})
