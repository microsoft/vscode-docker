/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'assert' provides assertion methods from node
import * as AdmZip from 'adm-zip';
import * as fse from 'fs-extra';
import { Context, Suite } from 'mocha';
import * as path from 'path';
import { commands, tasks, Uri } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { configure, httpsRequestBinary, Platform, bufferToString } from '../extension.bundle';
import * as assertEx from './assertEx';
import { shouldSkipDockerTest } from './dockerInfo';
import { getTestRootFolder, testInEmptyFolder, testUserInput } from './global.test';
import { runWithSetting } from './runWithSetting';

let testRootFolder: string = getTestRootFolder();
let buildOutputIndex: number = 0;

/**
 * Downloads and then extracts only a specific folder and its subfolders.
 */
async function unzipFileFromUrl(uri: Uri, sourceFolderInZip: string, outputFolder: string): Promise<void> {
    let zipContents = await httpsRequestBinary(uri.toString());
    let zip = new AdmZip(zipContents);
    await extractFolderTo(zip, sourceFolderInZip, outputFolder);
}

/**
 * Extracts only a specific folder and its subfolders.
 * Not using AdmZip.extractAllTo because depending on the .zip file we may end up with an extraneous top-level folder
 */
async function extractFolderTo(zip: AdmZip, sourceFolderInZip: string, outputFolder: string): Promise<void> {
    if (!(sourceFolderInZip.endsWith('/') || sourceFolderInZip.endsWith('\\'))) {
        sourceFolderInZip += '/';
    }

    var zipEntries = zip.getEntries();
    for (let entry of zipEntries) {
        if (entry.entryName.startsWith(sourceFolderInZip)) {
            let relativePath = entry.entryName.slice(sourceFolderInZip.length);
            if (!relativePath) {
                // root folder
                continue;
            }

            let outPath = path.join(outputFolder, relativePath);
            if (entry.isDirectory) {
                //console.log(`Folder: ${entry.entryName}`);
                await fse.mkdirs(outPath)
            } else {
                //console.log(`File: ${entry.entryName}`);
                let data: Buffer = entry.getData();
                await fse.writeFile(outPath, data);
            }
        }
    }
}

suite("Build Image", function (this: Suite): void {
    this.timeout(2 * 60 * 1000);

    async function testConfigureAndBuildImage(
        platform: Platform,
        configureInputs: (string | undefined)[],
        buildInputs: (string | undefined)[]
    ): Promise<void> {
        const testOutputFile = path.join(testRootFolder, `buildoutput${buildOutputIndex++}.txt`);

        // Set up simulated user input
        configureInputs.unshift(platform);

        const context: IActionContext = {
            telemetry: { properties: {}, measurements: {} },
            errorHandling: { issueProperties: {} }
        };

        await testUserInput.runWithInputs(configureInputs, async () => {
            await configure(context, testRootFolder);
        });

        // Build image
        const dockerFile = Uri.file(path.join(testRootFolder, 'Dockerfile'));

        try {
            await runWithSetting('commands.build', `docker build --pull --rm -f "\${dockerfile}" -t \${tag} "\${context}" > ${testOutputFile} 2>&1`, async () => {
                await testUserInput.runWithInputs(buildInputs, async () => {
                    const taskFinishedPromise = new Promise((resolve) => {
                        const disposable = tasks.onDidEndTask(() => {
                            disposable.dispose();
                            resolve();
                        });
                    });

                    await commands.executeCommand('vscode-docker.images.build', dockerFile);

                    // Wait for the task to finish
                    await taskFinishedPromise;
                });
            });

            const outputText = bufferToString(await fse.readFile(testOutputFile));

            assertEx.assertContains(outputText, 'Successfully built');
            assertEx.assertContains(outputText, 'Successfully tagged');
        } finally {
            if (await fse.pathExists(testOutputFile)) {
                await fse.unlink(testOutputFile);
            }
        }
    }

    // Go

    testInEmptyFolder("Go", async function (this: Context) {
        let context: IActionContext = {
            telemetry: { properties: {}, measurements: {} },
            errorHandling: { issueProperties: {} }
        };
        if (await shouldSkipDockerTest(context, { linuxContainers: true })) {
            this.skip();
            return;
        }

        let uri = 'https://codeload.github.com/cloudfoundry-community/simple-go-web-app/zip/master'; // https://github.com/cloudfoundry-community/simple-go-web-app/archive/master.zip
        await unzipFileFromUrl(Uri.parse(uri), 'simple-go-web-app-master', testRootFolder);
        await testConfigureAndBuildImage(
            'Go',
            ['3001'],
            ['testoutput:latest']
        );

        // CONSIDER: Run the built image
    });

    // CONSIDER TESTS:
    // 'Java'
    // '.NET Core Console'
    // 'ASP.NET Core'
    // 'Node.js'
    // 'Python'
    // 'Ruby'

});
