import * as vscode from "vscode";
import * as path from "path";
import * as fse from "fs-extra";
import mocha = require("mocha");
import { pathExists } from 'fs-extra';

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
        }
        if (workspaceFolders.length > 1) {
            console.error("There are unexpected multiple workspaces open");
            process.exit(1);
        }

        testRootFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        console.log(`testRootFolder: ${testRootFolder}`);
        if (path.basename(testRootFolder) !== constants.testOutputName) {
            console.error("vscode is opened against the wrong folder for tests");
            process.exit(1);
        }

        fse.ensureDirSync(testRootFolder);
        fse.emptyDirSync(testRootFolder);
    }

    return testRootFolder;
}

// Runs before all tests
suiteSetup(function (this: mocha.IHookCallbackContext): void {
});

// Runs after all tests
suiteTeardown(function (this: mocha.IHookCallbackContext): void {
    if (testRootFolder && path.basename(testRootFolder) === constants.testOutputName) {
        fse.emptyDir(testRootFolder);
    }
});
