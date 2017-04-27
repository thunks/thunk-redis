'use strict'
/**
 * thunk-redis - https://github.com/thunks/thunk-redis
 *
 * MIT Licensed
 */

exports.setPrivate = function (ctx, key, value) {
  Object.defineProperty(ctx, key, {
    value: value,
    writable: false,
    enumerable: false,
    configurable: false
  })
}

exports.slice = function (args, start) {
  start = start || 0
  if (start >= args.length) return []
  let len = args.length
  let ret = Array(len - start)
  while (len-- > start) ret[len - start] = args[len]
  return ret
}

exports.log = function (err) {
  let silent = this.silent
  if (err instanceof Error) {
    arguments[0] = err.stack
    silent = false
  }
  if (!silent) console.log.apply(console, arguments)
}
