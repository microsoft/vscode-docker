/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import * as gulp from 'gulp';
import * as eslint from 'gulp-eslint';
import * as sourcemaps from 'gulp-sourcemaps';
import * as ts from 'gulp-typescript';
import * as vsce from 'vsce';
import { gulp_webpack } from 'vscode-azureextensiondev';

const env = process.env;
const tsProject = ts.createProject('./tsconfig.json');

function compileTask() {
    return tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject()).js
        .pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: './' }))
        .pipe(gulp.dest(tsProject.options.outDir));
}

function lintTask() {
    return gulp.src(['src/**/*.ts'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
        .pipe(eslint.results(
            results => {
                if (results.warningCount) {
                    throw new Error('ESLint generated warnings.');
                }
            }));
}

function testTaskFactory(unitTestsOnly: boolean) {
    env.MOCHA_grep = unitTestsOnly ? '\\(unit\\)' : '';
    return cp.spawn('node', ['./dist/test/runTest.js'], { stdio: 'inherit', env });
}

function allTestsTask() {
    return testTaskFactory(false);
}

function unitTestsTask() {
    return testTaskFactory(true);
}

function webpackDevTask() {
    return gulp_webpack('development');
}

function webpackProdTask() {
    return gulp_webpack('production');
}

function vscePackageTask() {
    return vsce.createVSIX();
}

gulp.task('build', compileTask);
gulp.task('lint', lintTask);
gulp.task('package', gulp.series(compileTask, webpackProdTask, vscePackageTask));
gulp.task('test', gulp.series(compileTask, webpackProdTask, allTestsTask));
gulp.task('unit-test', gulp.series(compileTask, webpackProdTask, unitTestsTask));
gulp.task('webpack-dev', gulp.series(compileTask, webpackDevTask));
gulp.task('webpack-prod', gulp.series(compileTask, webpackProdTask));

gulp.task('ci-build', gulp.series(compileTask, lintTask, webpackProdTask, allTestsTask));
gulp.task('ci-package', gulp.series('ci-build', vscePackageTask));

gulp.task('test-only', gulp.series(allTestsTask));
