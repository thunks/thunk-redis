'use strict'
/* global describe, it, before, after, beforeEach */

const should = require('should')
const redis = require('..')

module.exports = function () {
  describe('commands:Geo', function () {
    let client

    before(function () {
      client = redis.createClient()
      client.on('error', function (error) {
        console.error('redis client:', error)
      })
    })

    beforeEach(function (done) {
      client.flushdb()(function (error, res) {
        should(error).be.equal(null)
        should(res).be.equal('OK')
      })(done)
    })

    after(function () {
      client.clientEnd()
    })

    it('client.geoadd, client.geodist, client.georadius', function (done) {
      client.geoadd('Sicily', 13.361389, 38.115556, 'Palermo', 15.087269, 37.502669, 'Catania')(function (error, res) {
        if (error && /unknown command/.test(error.message)) {
          console.log('Do not support "geoadd"')
          return done()
        }
        should(error).be.equal(null)
        should(res).be.equal(2)
        return this.geodist('Sicily', 'Palermo', 'Catania')(function (error, res) {
          should(error).be.equal(null)
          should(Math.floor(res)).be.equal(166274)
          return this.geodist('Sicily', 'Palermo', 'Catania', 'km')
        })(function (error, res) {
          should(error).be.equal(null)
          should(Math.floor(res)).be.eql(166)
          return this.georadius('Sicily', 15, 37, 100, 'km')
        })(function (error, res) {
          should(error).be.equal(null)
          should(res).be.eql(['Catania'])
          return this.georadius('Sicily', 15, 37, 200, 'km')
        })(function (error, res) {
          should(error).be.equal(null)
          should(res).be.eql(['Palermo', 'Catania'])
          return this.georadius('Sicily', 15, 37, 200, 'km', 'WITHDIST')
        })(function (error, res) {
          should(error).be.equal(null)
          should(res[0][0]).be.equal('Palermo')
          should(Math.floor(res[0][1])).be.equal(190)
          should(res[1][0]).be.equal('Catania')
          should(Math.floor(res[1][1])).be.equal(56)
          return this.georadius('Sicily', 15, 37, 200, 'km', 'WITHCOORD')
        })(function (error, res) {
          should(error).be.equal(null)
          should(res[0][0]).be.equal('Palermo')
          should(Math.floor(res[0][1][0])).be.equal(13)
          should(Math.floor(res[0][1][1])).be.equal(38)
          should(res[1][0]).be.equal('Catania')
          should(Math.floor(res[1][1][0])).be.equal(15)
          should(Math.floor(res[1][1][1])).be.equal(37)
        })(done)
      })
    })

    it('client.geohash', function (done) {
      client.geoadd('Sicily', 13.361389, 38.115556, 'Palermo', 15.087269, 37.502669, 'Catania')(function (error, res) {
        if (error && /unknown command/.test(error.message)) {
          console.log('Do not support "geoadd"')
          return done()
        }
        should(error).be.equal(null)
        should(res).be.equal(2)
        return this.zscore('Sicily', 'Palermo')(function (error, res) {
          should(error).be.equal(null)
          should(res).be.equal('3479099956230698')
          return this.geohash('Sicily', 'Palermo', 'Catania')
        })(function (error, res) {
          should(error).be.equal(null)
          should(res[0]).be.equal('sqc8b49rny0')
          should(res[1]).be.equal('sqdtr74hyu0')
        })(done)
      })
    })

    it('client.geopos, client.georadiusbymember', function (done) {
      client.geoadd('Sicily', 13.361389, 38.115556, 'Palermo', 15.087269, 37.502669, 'Catania', 13.583333, 37.316667, 'Agrigento')(function (error, res) {
        if (error && /unknown command/.test(error.message)) {
          console.log('Do not support "geoadd"')
          return done()
        }
        should(error).be.equal(null)
        should(res).be.equal(3)
        return this.geopos('Sicily', 'Palermo', 'Catania', 'NonExisting')(function (error, res) {
          should(error).be.equal(null)
          should(Math.floor(res[0][0] * 1000)).be.equal(13361)
          should(Math.floor(res[0][1] * 1000)).be.equal(38115)
          should(Math.floor(res[1][0] * 1000)).be.equal(15087)
          should(Math.floor(res[1][1] * 1000)).be.equal(37502)
          should(res[2]).be.equal(null)
          return this.georadiusbymember('Sicily', 'Agrigento', 100, 'km')
        })(function (error, res) {
          should(error).be.equal(null)
          should(res).be.eql(['Agrigento', 'Palermo'])
        })(done)
      })
    })
  })
}
