/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');
const decompress = require('gulp-decompress');
const download = require('gulp-download');
const path = require('path');
const os = require('os');
const cp = require('child_process');
const glob = require('glob');

gulp.task('test', ['install-azure-account'], (cb) => {
    const env = process.env;
    env.DEBUGTELEMETRY = 1;
    env.CODE_TESTS_WORKSPACE = './test/test.code-workspace';
    //env.MOCHA_reporter = 'mocha-junit-reporter';
    env.MOCHA_FILE = path.join(__dirname, 'test-results.xml');
    const cmd = cp.spawn('node', ['./node_modules/vscode/bin/test'], { stdio: 'inherit', env });
    cmd.on('close', (code) => {
        cb(code);
    });
});

/**
 * Installs the azure account extension before running tests (otherwise our extension would fail to activate)
 * NOTE: The version isn't super important since we don't actually use the account extension in tests
 */
gulp.task('install-azure-account', () => {
    const version = '0.4.3';
    const extensionPath = path.join(os.homedir(), `.vscode/extensions/ms-vscode.azure-account-${version}`);
    const existingExtensions = glob.sync(extensionPath.replace(version, '*'));
    if (existingExtensions.length === 0) {
        return download(`http://ms-vscode.gallery.vsassets.io/_apis/public/gallery/publisher/ms-vscode/extension/azure-account/${version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`)
            .pipe(decompress({
                filter: file => file.path.startsWith('extension/'),
                map: file => {
                    file.path = file.path.slice(10);
                    return file;
                }
            }))
            .pipe(gulp.dest(extensionPath));
    } else {
        console.log('Azure Account extension already installed.');
    }
});

