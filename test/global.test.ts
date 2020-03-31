/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fse from "fs-extra";
import * as mocha from 'mocha';
import * as path from "path";
import * as vscode from "vscode";
import { ext, TaskDefinitionBase } from "../extension.bundle";
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
export function testInEmptyFolderWithBuildTask(name: string, func?: mocha.AsyncFunc): void {
    test(name, !func ? undefined : async function (this: mocha.Context) {
        // Ensure build task is created which is required for NetCore scaffolding.
        const workspacefolder = vscode.workspace.workspaceFolders[0];
        await createBuildTask(name, workspacefolder);

        // Delete everything in the root testing folder
        assert(path.basename(testRootFolder) === constants.testOutputName, "Trying to delete wrong folder");;
        await fse.emptyDir(testRootFolder);
        await func.apply(this);
    });
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

async function createBuildTask(testName: string, folder: vscode.WorkspaceFolder): Promise<void> {
    const workspaceTasks = vscode.workspace.getConfiguration('tasks', folder.uri);
    const allTasks = workspaceTasks && workspaceTasks.tasks as TaskDefinitionBase[] || [];
    const existingTaskIndex = allTasks.findIndex(t => t.label === 'build');
    console.log(`${testName}: existing task index: ${existingTaskIndex}`)
    if (existingTaskIndex == -1) {
        var buildTask = {
            label: 'build',
            command: 'dotnet',
            type: 'process'
        };

        allTasks.push(buildTask);
        await workspaceTasks.update('tasks', allTasks, vscode.ConfigurationTarget.WorkspaceFolder);
        console.log(`${testName}: Build task created`);
        verifyBuildTask(testName, folder);
    }
}

function verifyBuildTask(testName: string, folder: vscode.WorkspaceFolder): void {
    const maxTry = 5;
    let i = 0;
    let buildTaskPresent = isBuildTaskPresent(folder);

    while (!buildTaskPresent && i < maxTry) {
        buildTaskPresent = isBuildTaskPresent(folder);
        i++;
    }
    assert.equal(buildTaskPresent, true);
    console.log(`${testName}: Verified the build task is present in the workspace after ${i} tries`);
}

function isBuildTaskPresent(folder: vscode.WorkspaceFolder): boolean {
    const workspaceTasks = vscode.workspace.getConfiguration('tasks', folder.uri);
    const allTasks = workspaceTasks && workspaceTasks.tasks as TaskDefinitionBase[] || [];
    return allTasks.some(t => t.label === 'build');
}

// Runs before all tests
suiteSetup(async function (this: mocha.IHookCallbackContext): Promise<void> {
    this.timeout(60 * 1000);
    console.log('global.test.ts: suiteSetup');

    ext.runningTests = true;
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
