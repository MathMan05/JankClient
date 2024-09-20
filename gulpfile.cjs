const gulp = require("gulp");
const ts = require("gulp-typescript");
const swc = require("gulp-swc");
const tsProject = ts.createProject("tsconfig.json");
const argv = require("yargs").argv;
const rimraf = require("rimraf");

const swcOptions = {
  jsc: {
    parser: {
      syntax: "typescript",
      tsx: false,
      decorators: true,
      dynamicImport: true,
    },
    transform: {
      react: {
        runtime: "automatic",
      },
    },
    target: "es2022",
    loose: false,
    externalHelpers: false,
    keepClassNames: true,
  },
  module: {
    type: "es6",
    strict: true,
    strictMode: true,
    lazy: false,
    noInterop: false,
  },
  sourceMaps: "inline",
  minify: false,
};

// Clean task to delete the dist directory
gulp.task("clean", () => {
  return rimraf.rimraf("dist");
});

// Task to compile TypeScript files using SWC
gulp.task("scripts", () => {
  if (argv.swc) {
    return gulp
      .src("src/**/*.ts")
      .pipe(swc(swcOptions))
      .pipe(gulp.dest("dist"));
  } else {
    console.warn("[WARN] Using TSC compiler, will be slower than SWC");
    return gulp.src("src/**/*.ts").pipe(tsProject()).pipe(gulp.dest("dist"));
  }
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
    ])
    .pipe(gulp.dest("dist"));
});

// Default task to run all tasks
gulp.task(
  "default",
  gulp.series("clean", gulp.parallel("scripts", "copy-html", "copy-assets"))
);
