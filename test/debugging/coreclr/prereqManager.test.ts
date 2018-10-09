/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileSystemProvider } from '../../../debugging/coreclr/fsProvider';
import { OSProvider } from '../../../debugging/coreclr/osProvider';
import { MacNuGetFallbackFolderSharedPrerequisite, ShowErrorMessageFunction } from '../../../debugging/coreclr/prereqManager';

suite('debugging', () => {
    suite('coreclr', () => {
        suite('prereqManager', () => {
            suite('MacNuGetFallbackFolderSharedPrerequisite', () => {
                const generateTest = (name: string, fileContents: string | undefined, result: boolean) => {
                    const settingsPath = '/Users/User/Library/Group Containers/group.com.docker/settings.json';

                    test(name, async () => {
                        const fsProvider = <FileSystemProvider>{
                            fileExists: (path: string) => {
                                assert.equal(settingsPath, path, 'The prerequisite should check for the settings file in the user\'s home directory.');

                                return Promise.resolve(fileContents !== undefined);
                            },
                            readFile: (path: string) => {
                                if (fileContents === undefined) {
                                    assert.fail('The prerequisite should not attempt to read a file that does not exist.');
                                }

                                assert.equal(settingsPath, path, 'The prerequisite should read the settings file in the user\'s home directory.');

                                return Promise.resolve(fileContents);
                            }
                        };

                        const osProvider = <OSProvider>{
                            homedir: '/Users/User',
                            isMac: true
                        };

                        let shown = false;

                        const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem | undefined> => {
                            shown = true;
                            return Promise.resolve<vscode.MessageItem | undefined>(undefined);
                        };

                        const prereq = new MacNuGetFallbackFolderSharedPrerequisite(fsProvider, osProvider, showErrorMessage);

                        const prereqResult = await prereq.checkPrerequisite();

                        assert.equal(result, prereqResult, 'The prerequisite should return `false` on Mac with no Docker settings file.');
                        assert.equal(!result, shown, `An error message should ${result ? 'not ' : ''} have been shown.`);
                    });
                }

                generateTest('Mac: no Docker settings file', undefined, false);
                generateTest('Mac: no shared folders in Docker settings file', '{}', false);
                generateTest('Mac: no NuGetFallbackFolder in Docker settings file', '{ "filesharingDirectories": [] }', false);
                generateTest('Mac: NuGetFallbackFolder in Docker settings file', '{ "filesharingDirectories": [ "/usr/local/share/dotnet/sdk/NuGetFallbackFolder" ] }', true);

                test('Non-Mac: No-op', async () => {
                    const osProvider = <OSProvider>{
                        isMac: false
                    };

                    const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem | undefined> => {
                        assert.fail('Should not be called on non-Mac.');
                        return Promise.resolve<vscode.MessageItem | undefined>(undefined);
                    };

                    const prereq = new MacNuGetFallbackFolderSharedPrerequisite(<FileSystemProvider>{}, osProvider, showErrorMessage);

                    const result = await prereq.checkPrerequisite();

                    assert.equal(true, result, 'The prerequisite should return `true` on non-Mac.');
                });
            });
        });
    });
});
