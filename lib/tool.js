'use strict';

exports.setPrivate = function (ctx, key, value) {
  Object.defineProperty(ctx, key, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: value
  });
};

exports.slice = function (args, start) {
  start = start || 0;
  if (start >= args.length) return [];
  var len = args.length, ret = Array(len - start);
  while (len-- > start) ret[len - start] = args[len];
  return ret;
};

exports.log = function () {
  console.log.apply(console, arguments);
};
