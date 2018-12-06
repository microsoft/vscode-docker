/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Grandfathered in
// tslint:disable:typedef
// tslint:disable:no-unsafe-any

import * as cp from 'child_process';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import * as gulp from 'gulp';
import * as decompress from 'gulp-decompress';
import * as download from 'gulp-download';
import * as os from 'os';
import * as path from 'path';

const env = process.env;

function webpack(mode) {
    // without this, webpack can run out of memory in some environments
    env.NODE_OPTIONS = '--max-old-space-size=8192';
    return spawn(path.join(__dirname, './node_modules/.bin/webpack'), ['--mode', mode], { stdio: 'inherit', env });
}

/**
 * Installs the azure account extension before running tests (otherwise our extension would fail to activate)
 * NOTE: The version isn't super important since we don't actually use the account extension in tests
 */
function installAzureAccount() {
    const version = '0.4.3';
    const extensionPath = path.join(os.homedir(), `.vscode/extensions/ms-vscode.azure-account-${version}`);
    const existingExtensions = glob.sync(extensionPath.replace(version, '*'));
    if (existingExtensions.length === 0) {
        // tslint:disable-next-line:no-http-string
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
        return Promise.resolve();
    }
}

function test() {
    env.DEBUGTELEMETRY = '1';
    env.CODE_TESTS_WORKSPACE = path.join(__dirname, 'test/test.code-workspace');
    env.CODE_TESTS_PATH = path.join(__dirname, 'dist/test');
    return spawn('node', ['./node_modules/vscode/bin/test'], { stdio: 'inherit', env });
}

function spawn(command, args, options) {
    if (process.platform === 'win32') {
        if (fse.pathExistsSync(command + '.exe')) {
            command = command + '.exe';
        } else if (fse.pathExistsSync(command + '.cmd')) {
            command = command + '.cmd';
        }
    }

    return cp.spawn(command, args, options);
}

exports['webpack-dev'] = () => webpack('development');
exports['webpack-prod'] = () => webpack('production');
exports.test = gulp.series(installAzureAccount, test);
