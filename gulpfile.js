'use strict';

var gulp = require('gulp');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');

gulp.task('jshint', function () {
  let source = ['src/*.js'];
  return gulp.src(source)
    .pipe(jshint({node: true}))
    .pipe(jshint.reporter('default'));
});

gulp.task('jscs', function () {
  let source = ['index.js', 'src/*.js'];
  gulp.src(source)
    .pipe(jscs().on('error', function (err) {
      console.log(err.toString());
    }));
});

gulp.task('watch', function () {
  let source = ['index.js', 'src/**/*.js', 'spec/**/*.spec.js'];
  let tasks = ['jscs', 'jshint'];
  gulp.watch(source, tasks);
});

//gulp.task('test', function () {
//  let source = ['spec/**/*.spec.js'];
//  return gulp.src(source)
//    .pipe(mocha({ ui: 'bdd', reporter: 'spec'}));
//});

gulp.task('default', ['watch'], function () {});