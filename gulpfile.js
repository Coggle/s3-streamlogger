var gulp = require('gulp');
var eslint = require('gulp-eslint');

function printError(){
    console.log(arguments); // eslint-disable-line no-console
}

gulp.task('lint', function() {
    var stream = gulp.src('./*.js')
        .pipe(eslint('eslint.json'))
        .pipe(eslint.format())
        .on('error', printError);
    return stream;
});

gulp.task('default', ['lint'], function () {
    gulp.watch('./*.js', ['lint']).on('error', printError);
});
