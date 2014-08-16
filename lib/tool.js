'use strict';

exports.setPrivate = function (key, value) {
  Object.defineProperty(this, key, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: value
  });
};

exports.slice = function (args, start) {
  var len = args.length, ret = Array(len);
  start = start || 0;
  while (len-- > start) ret[len - start] = args[len];
  return ret;
};

exports.log = function () {
  console.log.apply(console, arguments);
};