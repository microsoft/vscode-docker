/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'assert' provides assertion methods from node
import * as AdmZip from 'adm-zip';
import * as assert from 'assert';
import * as fse from 'fs-extra';
import { Context, Suite } from 'mocha';
import * as path from 'path';
import * as vscode from 'vscode';
import { commands, Uri } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { configure, ext, httpsRequestBinary, Platform } from '../extension.bundle';
import * as assertEx from './assertEx';
import { shouldSkipDockerTest } from './dockerInfo';
import { getTestRootFolder, testInEmptyFolder, testUserInput } from './global.test';
import { TestTerminalProvider } from './TestTerminalProvider';

let testRootFolder: string = getTestRootFolder();

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

    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Docker extension tests');
    ext.outputChannel = outputChannel;

    async function testConfigureAndBuildImage(
        platform: Platform,
        configureInputs: (string | undefined)[],
        buildInputs: (string | undefined)[]
    ): Promise<void> {
        // Set up simulated user input
        configureInputs.unshift(platform);
        let testTerminalProvider = new TestTerminalProvider();
        ext.terminalProvider = testTerminalProvider;

        let context: IActionContext = {
            telemetry: { properties: {}, measurements: {} },
            errorHandling: {}
        };

        await testUserInput.runWithInputs(configureInputs, async () => {
            await configure(context, testRootFolder);
        });

        // Build image
        let dockerFile = Uri.file(path.join(testRootFolder, 'Dockerfile'));
        await testUserInput.runWithInputs(buildInputs, async () => {
            await commands.executeCommand('vscode-docker.images.build', dockerFile);
        });

        let { outputText, errorText } = await testTerminalProvider.currentTerminal!.exit();

        assert.equal(errorText, '', 'Expected no errors from Build Image');
        assertEx.assertContains(outputText, 'Successfully built');
        assertEx.assertContains(outputText, 'Successfully tagged')
    }

    // Go

    testInEmptyFolder("Go", async function (this: Context) {
        if (await shouldSkipDockerTest({ linuxContainers: true })) {
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
