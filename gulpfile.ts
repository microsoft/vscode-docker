/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import * as gulp from 'gulp';
import * as eslint from 'gulp-eslint';
import * as sourcemaps from 'gulp-sourcemaps';
import * as ts from 'gulp-typescript';
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

function lintTaskFactory(warningsAsErrors?: boolean) {
    return function lintTask() {
        let pipeline = gulp.src(['src/**/*.ts'])
            .pipe(eslint())
            .pipe(eslint.format())
            .pipe(eslint.failAfterError());

        if (warningsAsErrors) {
            pipeline = pipeline
                .pipe(eslint.results(
                    results => {
                        if (results.warningCount) {
                            throw new Error('ESLint generated warnings.');
                        }
                    }));
        }

        return pipeline;
    }
}

function testTaskFactory(unitTestsOnly: boolean) {
    env.DEBUGTELEMETRY = '1';
    env.CODE_TESTS_WORKSPACE = path.join(__dirname, 'test/test.code-workspace');
    env.MOCHA_grep = unitTestsOnly ? '\\(unit\\)' : '';
    env.MOCHA_timeout = String(10 * 1000);
    env.CODE_TESTS_PATH = path.join(__dirname, 'dist/test');
    return () => cp.spawn('node.exe', ['./node_modules/vscode/bin/test'], { stdio: 'inherit', env });
}

function vscePackageTask() {
    return vsce.createVSIX();
}

gulp.task('build', compileTask);
gulp.task('lint', lintTaskFactory(true));
gulp.task('package', gulp.series(compileTask, () => gulp_webpack('production'), vscePackageTask));
gulp.task('test', gulp.series(gulp_installAzureAccount, compileTask, testTaskFactory(false)));
gulp.task('unit-test', gulp.series(gulp_installAzureAccount, compileTask, testTaskFactory(true)));
gulp.task('webpack', gulp.series(compileTask, () => gulp_webpack('development')));
gulp.task('webpack-prod', gulp.series(compileTask, () => gulp_webpack('production')));

gulp.task('ci-build', gulp.series(gulp_installAzureAccount, compileTask, () => gulp_webpack('production'), testTaskFactory(false)));
gulp.task('ci-package', gulp.series('ci-build', vscePackageTask));
