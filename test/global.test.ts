/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fse from "fs-extra";
import * as mocha from 'mocha';
import * as path from "path";
import * as vscode from "vscode";
import { ext } from "../extension.bundle";
import { TestKeytar } from "../test/testKeytar";
import { TestUserInput } from 'vscode-azureextensiondev';

export namespace constants {
    export const testOutputName = 'testOutput';
}

// The root workspace folder that vscode is opened against for tests
let testRootFolder: string;

export let testUserInput: TestUserInput = new TestUserInput(vscode);

export function getTestRootFolder(): string {
    if (!testRootFolder) {
        // We're expecting to be opened against the test/test.code-workspace
        // workspace.
        let workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.error("No workspace is open.");
            process.exit(1);
        } else {
            if (workspaceFolders.length > 1) {
                console.error("There are unexpected multiple workspaces open");
                process.exit(1);
            }

            testRootFolder = workspaceFolders[0].uri.fsPath;
            console.log(`testRootFolder: ${testRootFolder}`);
            if (path.basename(testRootFolder) !== constants.testOutputName) {
                console.error("vscode is opened against the wrong folder for tests");
                process.exit(1);
            }

            fse.ensureDirSync(testRootFolder);
            fse.emptyDirSync(testRootFolder);
        }
    }

    return testRootFolder;
}

/**
 * Run a test with an empty root testing folder (i.e. delete everything out of it before running the test).
 * This is important since we can't open new folders in vscode while tests are running
 */
export function testInEmptyFolder(name: string, func?: mocha.AsyncFunc): void {
    test(name, !func ? undefined : async function (this: mocha.Context) {
        // Delete everything in the root testing folder
        assert(path.basename(testRootFolder) === constants.testOutputName, "Trying to delete wrong folder");;
        await fse.emptyDir(testRootFolder);
        await func.apply(this);
    });
}

// Runs before all tests
suiteSetup(async function (this: mocha.IHookCallbackContext): Promise<void> {
    this.timeout(60 * 1000);
    console.log('global.test.ts: suiteSetup');

    // Otherwise the app can blocking asking for keychain access
    ext.keytar = new TestKeytar();

    console.log("Refreshing tree to make sure extension is activated");
    await vscode.commands.executeCommand('vscode-docker.registries.refresh');
    console.log("Refresh done");
    assert(!!ext.context, "Extension not activated");

    ext.ui = testUserInput;
});

// Runs after all tests
suiteTeardown(async function (this: mocha.IHookCallbackContext): Promise<void> {
    console.log('global.test.ts: suiteTeardown');

    if (testRootFolder && path.basename(testRootFolder) === constants.testOutputName) {
        fse.emptyDir(testRootFolder);
    }
});
