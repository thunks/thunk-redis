/*global Buffer require exports console */
'use strict';

var net = require('net'),
  Thunk = require('thunks')();

exports.setPrivate = function (key, value) {
  Object.defineProperty(this, key, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: value
  });
};

exports.slice = function (args, start) {
  var ret = [], len = args.length;
  start = start || 0;
  while (len-- > start) ret[len - start] = args[len];
  return ret;
};