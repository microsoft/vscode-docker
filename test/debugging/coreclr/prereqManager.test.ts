/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileSystemProvider } from '../../../debugging/coreclr/fsProvider';
import { OSProvider, PlatformType } from '../../../debugging/coreclr/osProvider';
import { MacNuGetFallbackFolderSharedPrerequisite } from '../../../debugging/coreclr/prereqManager';

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
                            os: 'Linux'
                        };

                        let shown = false;

                        const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem> => {
                            shown = true;
                            return undefined;
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

                test('Windows: No-op', async () => {
                    const osProvider = <OSProvider>{
                        os: 'Windows'
                    };

                    const prereq = new MacNuGetFallbackFolderSharedPrerequisite(undefined, osProvider, undefined);

                    const result = await prereq.checkPrerequisite();

                    assert.equal(true, result, 'The prerequisite should return `true` on Windows.');
                });
            });
        });
    });
});
