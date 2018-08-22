/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');
const path = require('path');
const azureStorage = require('azure-storage');
const vsce = require('vsce');
const packageJson = require('./package.json');

const brightYellowFormatting = '\x1b[33m\x1b[1m%s\x1b[0m';
const brightWhiteFormatting = '\x1b[1m%s\x1b[0m';

gulp.task('package', async () => {
    await vsce.createVSIX();
});

gulp.task('upload-vsix', (callback) => {
    if (process.env.TRAVIS_PULL_REQUEST_BRANCH) {
        console.log('Skipping upload-vsix for PR build.');
    } else {
        const containerName = packageJson.name;
        const vsixName = `${packageJson.name}-${packageJson.version}.vsix`;
        const blobPath = path.join(process.env.TRAVIS_BRANCH, process.env.TRAVIS_BUILD_NUMBER, vsixName);
        const storageName = process.env.STORAGE_NAME;
        const storageKey = process.env.STORAGE_KEY;
        if (!storageName || !storageKey) {
            console.log();
            console.log(brightYellowFormatting, '======== Skipping upload of VSIX to storage account because STORAGE_NAME and STORAGE_KEY have not been set');
        } else {
            const blobService = azureStorage.createBlobService(process.env.STORAGE_NAME, process.env.STORAGE_KEY);
            blobService.createContainerIfNotExists(containerName, { publicAccessLevel: "blob" }, (err) => {
                if (err) {
                    callback(err);
                } else {
                    blobService.createBlockBlobFromLocalFile(containerName, blobPath, vsixName, (err) => {
                        if (err) {
                            callback(err);
                        } else {
                            console.log();
                            console.log(brightYellowFormatting, '================================================ vsix url ================================================');
                            console.log();
                            console.log(brightWhiteFormatting, blobService.getUrl(containerName, blobPath));
                            console.log();
                            console.log(brightYellowFormatting, '==========================================================================================================');
                            console.log();
                        }
                    });
                }
            });
        }
    }
});
