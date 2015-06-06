'use strict'

var gulp = require('gulp')
var gulpSequence = require('gulp-sequence')
var mocha = require('gulp-mocha')

gulp.task('mocha', function () {
  return gulp.src('test/index.js', {read: false})
    .pipe(mocha({
      timeout: 8000
    }))
})

gulp.task('mocha-full', function () {
  return gulp.src('test/index-full.js', {read: false})
    .pipe(mocha({
      timeout: 8000
    }))
})

gulp.task('mocha-cluster', function () {
  return gulp.src('test/cluster.js', {read: false})
    .pipe(mocha({
      timeout: 100000
    }))
})

gulp.task('default', gulpSequence('mocha-full'))

gulp.task('cluster', gulpSequence('mocha-cluster'))

gulp.task('test', gulpSequence('mocha'))
