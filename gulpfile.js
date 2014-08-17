'use strict';

var gulp = require('gulp'),
  runSequence = require('run-sequence'),
  jshint = require('gulp-jshint'),
  mocha = require('gulp-mocha');

gulp.task('jshint', function () {
  return gulp.src(['*.js', 'lib/*.js', 'test/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('mocha', function () {
  return gulp.src('test/*.js', {read: false})
    .pipe(mocha());
});

gulp.task('default', function (callback) {
  runSequence('jshint', callback);
});

gulp.task('test', function (callback) {
  runSequence('jshint', 'mocha', callback);
});
