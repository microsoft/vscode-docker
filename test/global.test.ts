/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import * as path from "path";
import * as fse from "fs-extra";
import mocha = require("mocha");
import * as assert from 'assert';
import { ext } from "../extensionVariables";
import { TestKeytar } from "../test/testKeytar";

export namespace constants {
    export const testOutputName = 'testOutput';
}

// The root workspace folder that vscode is opened against for tests
let testRootFolder: string;

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
export function testInEmptyFolder(name: string, func?: () => Promise<void>): void {
    test(name, !func ? undefined : async () => {
        // Delete everything in the root testing folder
        assert(path.basename(testRootFolder) === constants.testOutputName, "Trying to delete wrong folder");;
        await fse.emptyDir(testRootFolder);
        await func();
    });
}

// Runs before all tests
suiteSetup(async function (this: mocha.IHookCallbackContext): Promise<void> {
    console.log('global.test.ts: suiteSetup');

    // Otherwise the app can blocking asking for keychain access
    ext.keytar = new TestKeytar();

    // Make sure extension is activated
    await vscode.commands.executeCommand('vscode-docker.explorer.refresh');
    assert(!!ext.context, "Extension not activated");
});

// Runs after all tests
suiteTeardown(async function (this: mocha.IHookCallbackContext): Promise<void> {
    console.log('global.test.ts: suiteTestdown');

    if (testRootFolder && path.basename(testRootFolder) === constants.testOutputName) {
        fse.emptyDir(testRootFolder);
    }
});
