'use strict';
/*global describe, it, before, after, beforeEach, afterEach*/

var should = require('should');
var redis = require('../index');

// describe('Array', function(){
//   before(function () {
//     console.log('before', Date.now());
//   });
//   after(function () {
//     console.log('after', Date.now());
//   });
//   beforeEach(function () {
//     console.log('beforeEach', Date.now());
//   });
//   afterEach(function () {
//     console.log('afterEach', Date.now());
//   });
//   describe('111', function(){
//     it('test1', function (done) {
//       should(1).be.exactly(1);
//       setTimeout(function () {
//         console.log('it1', Date.now());
//         done();
//       });
//     });
//     it('test2', function () {
//       should(2).be.exactly(2);
//       console.log('it2', Date.now());
//     });
//   });
//   describe('222', function(){
//     it('test3', function () {
//       should(1).be.exactly(1);
//       console.log('it3', Date.now());
//     });
//     it('test4', function () {
//       should(2).be.exactly(2);
//       console.log('it4', Date.now());
//     });
//   });
// });