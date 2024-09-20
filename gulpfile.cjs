const gulp = require("gulp");
const ts = require("gulp-typescript");
const tsProject = ts.createProject("tsconfig.json");

// Task to compile TypeScript files
gulp.task("scripts", () => {
  return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("dist"));
});

// Task to copy HTML files
gulp.task("copy-html", () => {
  return gulp.src("src/**/*.html").pipe(gulp.dest("dist"));
});

// Task to copy other static assets (e.g., CSS, images)
gulp.task("copy-assets", () => {
  return gulp
    .src([
      "src/**/*.css",
      "src/**/*.bin",
      "src/**/*.ico",
      "src/**/*.json",
      "src/**/*.js",
      "src/**/*.png",
      "src/**/*.jpg",
      "src/**/*.jpeg",
      "src/**/*.gif",
      "src/**/*.svg",
    ],{encoding:false})
    .pipe(gulp.dest("dist"));
});

// Default task to run all tasks
gulp.task("default", gulp.series("scripts", "copy-html", "copy-assets"));
