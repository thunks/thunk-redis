'use strict';

var gulp = require('gulp'),
  gulpSequence = require('gulp-sequence'),
  jshint = require('gulp-jshint'),
  mocha = require('gulp-mocha');

gulp.task('jshint', function () {
  return gulp.src(['*.js', 'lib/*.js', 'test/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('mocha', function () {
  return gulp.src('test/index.js', {read: false})
    .pipe(mocha({
      timeout: 8000
    }));
});

gulp.task('mocha-full', function () {
  return gulp.src('test/index-full.js', {read: false})
    .pipe(mocha({
      timeout: 8000
    }));
});

gulp.task('default', gulpSequence('jshint', 'mocha-full'));

gulp.task('test', gulpSequence('jshint', 'mocha'));
