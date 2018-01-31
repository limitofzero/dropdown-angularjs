var gulp = require('gulp'),
      less = require('gulp-less')
      concat = require('gulp-concat');

gulp.task('less', () => {
    gulp.src([
        './src/less/*.less'
    ])
    .pipe(less())
    .pipe(gulp.dest('./build/css'));
})

gulp.task('concat', () => {
    gulp.src([
        './src/outclick.js',
        './src/dropdown-select.js'
    ])
    .pipe(concat('dropdown.js'))
    .pipe(gulp.dest('./build/'));
})

gulp.task('watch', () => {
    gulp.watch('./src/less/*.less', ['less']);
    gulp.watch('./src/*.js', ['concat']);
})

gulp.task('default', ['less', 'concat']);