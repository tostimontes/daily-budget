const gulp = require('gulp');
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const browserSync = require('browser-sync').create();
const nodemon = require('gulp-nodemon');

// Sync Nodemon with Gulp
gulp.task('nodemon', function (cb) {
  let started = false;

  return nodemon({
    script: 'bin/www',
    watch: ['app.js', 'bin/www', 'routes/'],
  }).on('start', function () {
    if (!started) {
      cb();
      started = true;
    }
  });
});

gulp.task('css', function () {
  // Require the PostCSS plugins from the config file
  const postCSSPlugins = require('./postcss.config.js').plugins;

  return gulp
    .src('public/stylesheets/style.css')
    .pipe(
      postcss([
        require('tailwindcss')(postCSSPlugins.tailwindcss),
        require('autoprefixer')(postCSSPlugins.autoprefixer),
      ])
    ) // Pass the plugins to the postcss function
    .pipe(rename('output.css')) // Rename the output file
    .pipe(gulp.dest('public/stylesheets')); // Save it in the same directory
});

gulp.task('browserSync', function () {
  browserSync.init({
    proxy: 'http://localhost:3000',
    port: 5000,
    open: true,
    notify: false,
  });

  gulp.watch(
    [
      'public/stylesheets/style.css',
      'tailwind.config.js',
      'views/**/*.ejs',
      'routes/**/*.js',
    ],
    gulp.series('css')
  );
  gulp
    .watch([
      'public/stylesheets/style.css',
      'tailwind.config.js',
      'views/**/*.ejs',
      'routes/**/*.js',
    ])
    .on('change', browserSync.reload);
});

gulp.task('default', gulp.parallel('nodemon', 'css', 'browserSync'));
