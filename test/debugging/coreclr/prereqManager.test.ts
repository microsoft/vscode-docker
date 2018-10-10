/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileSystemProvider } from '../../../debugging/coreclr/fsProvider';
import { OSProvider } from '../../../debugging/coreclr/osProvider';
import { ProcessProvider } from '../../../debugging/coreclr/processProvider';
import { MacNuGetFallbackFolderSharedPrerequisite, LinuxUserInDockerGroupPrerequisite, ShowErrorMessageFunction, DockerDaemonIsLinuxPrerequisite } from '../../../debugging/coreclr/prereqManager';
import { PlatformOS } from '../../../utils/platform';
import { DockerClient } from '../../../debugging/coreclr/dockerClient';

suite('debugging', () => {
    suite('coreclr', () => {
        suite('prereqManager', () => {
            suite('DockerDaemonIsLinuxPrerequisite', () => {
                const generateTest = (name: string, result: boolean, os: PlatformOS) => {
                    test(name, async () => {
                        let gotVersion = false;

                        const dockerClient = <DockerClient>{
                            getVersion: (options) => {
                                gotVersion = true;

                                assert.deepEqual(options, { format: '{{json .Server.Os}}' }, 'The server OS should be requested, in JSON format.');

                                return Promise.resolve(`"${os.toLowerCase()}"`);
                            }
                        };

                        let shown = false;

                        const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem | undefined> => {
                            shown = true;
                            return Promise.resolve<vscode.MessageItem | undefined>(undefined);
                        };

                        const prerequisite = new DockerDaemonIsLinuxPrerequisite(dockerClient, showErrorMessage);

                        const prereqResult = await prerequisite.checkPrerequisite();

                        assert.equal(gotVersion, true, 'The Docker version should have been requested.');

                        assert.equal(prereqResult, result, 'The prerequisite should return `false`.');
                        assert.equal(shown, !result, `An error message should ${result ? 'not ' : ''} have been shown.`);
                    });
                }

                generateTest('Linux daemon', true, 'Linux');
                generateTest('Windows daemon', false, 'Windows');
            });

            suite('LinuxUserInDockerGroupPrerequisite', () => {
                const generateTest = (name: string, result: boolean, os: PlatformOS, isMac?: boolean, inGroup?: boolean) => {
                    test(name, async () => {
                        const osProvider = <OSProvider>{
                            os,
                            isMac
                        }

                        let processProvider: ProcessProvider;
                        let listed = false;

                        if (os === 'Linux' && !isMac) {
                            processProvider = <ProcessProvider>{
                                exec: (command: string, _) => {
                                    listed = true;

                                    assert.equal(command, 'id -Gn', 'The prerequisite should list the user\'s groups.')

                                    const groups = inGroup ? 'groupA docker groupB' : 'groupA groupB';

                                    return Promise.resolve({ stdout: groups, stderr: ''});
                                }
                            };
                        }

                        let shown = false;

                        const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem | undefined> => {
                            shown = true;
                            return Promise.resolve<vscode.MessageItem | undefined>(undefined);
                        };

                        const prerequisite = new LinuxUserInDockerGroupPrerequisite(osProvider, processProvider, showErrorMessage);

                        const prereqResult = await prerequisite.checkPrerequisite();

                        if (os === 'Linux' && !isMac) {
                            assert.equal(listed, true, 'The user\'s groups should have been listed.');
                        }

                        assert.equal(prereqResult, result, 'The prerequisite should return `false`.');
                        assert.equal(shown, !result, `An error message should ${result ? 'not ' : ''} have been shown.`);
                    });
                };

                generateTest('Windows: No-op', true, 'Windows');
                generateTest('Mac: No-op', true, 'Linux', true);
                generateTest('Linux: In group', true, 'Linux', false, true);
                generateTest('Linux: Not in group', false, 'Linux', false, false);
            });

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

                        assert.equal(prereqResult, result, 'The prerequisite should return `false`.');
                        assert.equal(shown, !result, `An error message should ${result ? 'not ' : ''} have been shown.`);
                    });
                }

                generateTest('Mac: no Docker settings file', undefined, true);
                generateTest('Mac: no shared folders in Docker settings file', '{}', true);
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
