/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileSystemProvider } from '../../../extension.bundle';
import { OSProvider } from '../../../extension.bundle';
import { ProcessProvider } from '../../../extension.bundle';
import { MacNuGetFallbackFolderSharedPrerequisite, LinuxUserInDockerGroupPrerequisite, DockerDaemonIsLinuxPrerequisite, DockerfileExistsPrerequisite, DotNetSdkInstalledPrerequisite } from '../../../extension.bundle';
import { PlatformOS } from '../../../extension.bundle';
import { DockerClient } from '../../../extension.bundle';
import { DotNetClient } from '../../../extension.bundle';
import { LaunchOptions } from '../../../extension.bundle';

suite('(unit) debugging/coreclr/prereqManager', () => {
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

    suite('DotNetSdkInstalledPrerequisite', () => {
        test('Installed', async () => {
            const msBuildClient = <DotNetClient>{
                getVersion: () => Promise.resolve('2.1.402')
            };

            let shown = false;

            const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem | undefined> => {
                shown = true;
                return Promise.resolve<vscode.MessageItem | undefined>(undefined);
            };

            const prerequisite = new DotNetSdkInstalledPrerequisite(msBuildClient, showErrorMessage);

            const prereqResult = await prerequisite.checkPrerequisite();

            assert.equal(prereqResult, true, 'The prerequisite should pass if the SDK is installed.');
            assert.equal(shown, false, 'No error should be shown.');
        });

        test('Not installed', async () => {
            const msBuildClient = <DotNetClient>{
                getVersion: () => Promise.resolve(undefined)
            };

            let shown = false;

            const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem | undefined> => {
                shown = true;
                return Promise.resolve<vscode.MessageItem | undefined>(undefined);
            };

            const prerequisite = new DotNetSdkInstalledPrerequisite(msBuildClient, showErrorMessage);

            const prereqResult = await prerequisite.checkPrerequisite();

            assert.equal(prereqResult, false, 'The prerequisite should fail if no SDK is installed.');
            assert.equal(shown, true, 'An error should be shown.');
        });
    });

    suite('LinuxUserInDockerGroupPrerequisite', () => {
        const generateTest = (name: string, result: boolean, os: PlatformOS, inGroup?: boolean) => {
            test(name, async () => {
                const osProvider = <OSProvider>{ os }
                let processProvider = <ProcessProvider>{};
                let listed = false;

                if (os === 'Linux') {
                    processProvider = <ProcessProvider>{
                        exec: (command: string, _) => {
                            listed = true;

                            assert.equal(command, 'id -Gn', 'The prerequisite should list the user\'s groups.')

                            const groups = inGroup ? 'groupA docker groupB' : 'groupA groupB';

                            return Promise.resolve({ stdout: groups, stderr: '' });
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

                if (os === 'Linux') {
                    assert.equal(listed, true, 'The user\'s groups should have been listed.');
                }

                assert.equal(prereqResult, result, 'The prerequisite should return `false`.');
                assert.equal(shown, !result, `An error message should ${result ? 'not ' : ''} have been shown.`);
            });
        };

        generateTest('Windows: No-op', true, 'Windows');
        generateTest('Mac: No-op', true, 'Mac');
        generateTest('Linux: In group', true, 'Linux', true);
        generateTest('Linux: Not in group', false, 'Linux', false);
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
                    os: 'Mac'
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
                os: 'Linux'
            };

            const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem | undefined> => {
                assert.fail('Should not be called on non-Mac.');
                return Promise.resolve<vscode.MessageItem | undefined>(undefined);
            };

            const prereq = new MacNuGetFallbackFolderSharedPrerequisite(<FileSystemProvider>{}, osProvider, showErrorMessage);

            const result = await prereq.checkPrerequisite();

            assert.equal(result, true, 'The prerequisite should return `true` on non-Mac.');
        });
    });

    suite('DockerfileExistsPrerequisite', () => {
        const generateTest = (name: string, dockerfileExists: boolean, userElectsToScaffold?: boolean) => {
            test(name, async () => {
                const dockerfile = '/users/user/repos/repo/Dockerfile';

                let wasFileExistsCalled = false;

                const fsProvider = <FileSystemProvider>{
                    fileExists: (path: string) => {
                        wasFileExistsCalled = true;

                        assert.equal(path, dockerfile, 'The path should be that of the Dockerfile.');

                        return Promise.resolve(dockerfileExists)
                    }
                };

                let wasShowErrorMessageCalled = false;

                const showErrorMessage = (message: string, ...items: vscode.MessageItem[]): Thenable<vscode.MessageItem | undefined> => {
                    wasShowErrorMessageCalled = true;

                    if (!dockerfileExists) {
                        assert.equal(items.length > 0 && items[0] !== undefined, true, 'An option to scaffold should be returned.');
                    }

                    if (userElectsToScaffold) {
                        return Promise.resolve<vscode.MessageItem | undefined>(items[0]);
                    } else {
                        return Promise.resolve<vscode.MessageItem | undefined>(undefined);
                    }
                };

                let wasCommandExecuted = false;

                const executeCommand = (command: string) => {
                    wasCommandExecuted = true;

                    assert.equal(command, 'vscode-docker.configure', 'The scaffolding command should be executed.');
                };

                const prereq = new DockerfileExistsPrerequisite(fsProvider, showErrorMessage, executeCommand);

                const options = <LaunchOptions>{
                    build: {
                        dockerfile
                    }
                };

                const result = await prereq.checkPrerequisite(options);

                assert.equal(result, dockerfileExists, 'The prerequisite should return `true` when the Dockerfile exists.');
                assert.equal(wasFileExistsCalled, true, 'The Dockerfile should have been tested for existence.');
                assert.equal(wasShowErrorMessageCalled, !dockerfileExists, 'The user should be shown an error when the Dockerfile does not exist.');
                assert.equal(wasCommandExecuted, !dockerfileExists && userElectsToScaffold === true, 'The scaffold command should be executed only if the Dockerfile does not exist and the user elects to scaffold.');
            });
        };

        generateTest('Dockerfile exists', true);
        generateTest('Dockerfile does not exist', false);
        generateTest('Dockerfile does not exist and user elects to scaffold', false, true);
    });
});
