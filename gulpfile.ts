/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import * as gulp from 'gulp';
import * as eslint from 'gulp-eslint';
import * as sourcemaps from 'gulp-sourcemaps';
import * as ts from 'gulp-typescript';
import * as os from 'os';
import * as path from 'path';
import * as vsce from 'vsce';
import { gulp_installAzureAccount, gulp_webpack } from 'vscode-azureextensiondev';

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
    if (os.platform() === 'win32') {
        // For some reason this is getting set to '--max-old-space-size=8192', which in turn for some reason causes the VSCode test process to instantly crash with error code 3 on Windows
        // Which makes no sense because the default is 512 MB max
        env.NODE_OPTIONS = '';
    }
    env.DEBUGTELEMETRY = '1';
    env.CODE_TESTS_WORKSPACE = path.join(__dirname, 'test/test.code-workspace');
    env.MOCHA_grep = unitTestsOnly ? '\\(unit\\)' : '';
    env.MOCHA_timeout = String(10 * 1000);
    env.CODE_TESTS_PATH = path.join(__dirname, 'dist/test');
    return cp.spawn('node', ['./node_modules/vscode/bin/test'], { stdio: 'inherit', env });
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
gulp.task('test', gulp.series(gulp_installAzureAccount, compileTask, webpackProdTask, allTestsTask));
gulp.task('unit-test', gulp.series(gulp_installAzureAccount, compileTask, webpackProdTask, unitTestsTask));
gulp.task('webpack-dev', gulp.series(compileTask, webpackDevTask));
gulp.task('webpack-prod', gulp.series(compileTask, webpackProdTask));

gulp.task('ci-build', gulp.series(gulp_installAzureAccount, compileTask, lintTask, webpackProdTask, allTestsTask));
gulp.task('ci-package', gulp.series('ci-build', vscePackageTask));

gulp.task('test-only', gulp.series(gulp_installAzureAccount, allTestsTask));
