/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// This will eventually be replaced by an API in the Python extension. See https://github.com/microsoft/vscode-python/issues/7282

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from "vscode";
import CliDockerClient from '../../debugging/coreclr/CliDockerClient';
import { localize } from '../../localize';
import { delay } from '../../utils/delay';
import { PythonDefaultDebugPort, PythonTarget } from '../../utils/pythonUtils';

export namespace PythonExtensionHelper {
    export interface DebugLaunchOptions {
        host?: string;
        port?: number;
        wait?: boolean;
    }

    export function getDebuggerEnvironmentVars(): { [key: string]: string } {
        return { 'PTVSD_LOG_DIR': '/dbglogs' };
    }

    export function getDebuggerLogFilePath(folderName: string): string {
        // The debugger generates the log file with the name in this format: ptvsd-{pid}.log,
        // So given that we run the debugger as the entry point, then the PID is guaranteed to be 1.
        return path.join(os.tmpdir(), folderName, 'ptvsd-1.log');
    }

    export async function ensureDebuggerReady(prelaunchTask: vscode.Task, debuggerSemaphorePath: string, containerName: string, cliDockerClient: CliDockerClient): Promise<void> {
        // tslint:disable-next-line:promise-must-complete
        return new Promise((resolve, reject) => {
            const listener = vscode.tasks.onDidEndTask(async e => {
                if (e.execution.task === prelaunchTask) {
                    try {
                        // There is no way to know the result of the completed task, so a best guess is to check if the container is running.
                        const containerRunning = await cliDockerClient.inspectObject(containerName, { format: '{{.State.Running}}' });

                        if (containerRunning === 'false') {
                            reject(localize('vscode-docker.tasks.pythonExt.failedToAttach', 'Failed to attach the debugger, please see the terminal output for more details.'));
                        }

                        const maxRetriesCount = 20;
                        let retries = 0;
                        let created = false;

                        // Look for the magic string below in the log file with a retry every 0.5 second for a maximum of 10 seconds.
                        // TODO: Should be gone as soon as the retry logic is part of the Python debugger/extension.
                        while (++retries < maxRetriesCount && !created) {
                            if (await fse.pathExists(debuggerSemaphorePath)) {
                                const contents = await fse.readFile(debuggerSemaphorePath);

                                created = contents.toString().indexOf('Starting server daemon on') >= 0;
                                if (created) {
                                    break;
                                }
                            }

                            await delay(500);
                        }

                        if (created) {
                            resolve();
                        } else {
                            reject(localize('vscode-docker.tasks.pythonExt.attachTimeout', 'Failed to attach the debugger within the alotted timeout.'));
                        }
                    } catch {
                        reject(localize('vscode-docker.tasks.pythonExt.unexpectedAttachError', 'An unexpected error occurred while attempting to attach the debugger.'));
                    } finally {
                        listener.dispose();
                    }
                }
            });
        });
    }

    export function getRemotePtvsdCommand(target: PythonTarget, args?: string[], options?: DebugLaunchOptions): string {
        let fullTarget: string;

        if ('file' in target) {
            fullTarget = target.file;
        } else if ('module' in target) {
            fullTarget = `-m ${target.module}`;
        } else {
            throw new Error(localize('vscode-docker.tasks.pythonExt.moduleOrFile', 'One of either module or file must be provided.'));
        }

        options = options ?? {};
        options.host = options.host || '0.0.0.0';
        options.port = options.port || PythonDefaultDebugPort;
        options.wait = !!options.wait;
        args = args ?? [];

        return `/pydbg/ptvsd --host ${options.host} --port ${options.port} ${options.wait ? '--wait' : ''} ${fullTarget} ${args.join(' ')}`;
    }

    export async function getLauncherFolderPath(): Promise<string> {
        const pyExtensionId = 'ms-python.python';
        const pyExt = vscode.extensions.getExtension(pyExtensionId);
        const button = localize('vscode-docker.tasks.pythonExt.openExtension', 'Open Extension');

        if (!pyExt) {
            const response = await vscode.window.showErrorMessage(localize('vscode-docker.tasks.pythonExt.pythonExtensionNeeded', 'For debugging Python apps in a container to work, the Python extension must be installed.'), button);

            if (response === button) {
                await vscode.commands.executeCommand('extension.open', pyExtensionId);
            }

            return undefined;
        }

        const debuggerPath = path.join(pyExt.extensionPath, 'pythonFiles', 'lib', 'python');
        const oldDebugger = path.join(debuggerPath, 'old_ptvsd');
        const newDebugger = path.join(debuggerPath, 'new_ptvsd');

        // Always favor the old_ptvsd debugger since it will work in all cases.
        // If it is not found, then look for the new instead.
        // TODO: This should be revisited when the Python extension releases the new debugger since it might have a different name.

        if ((await fse.pathExists(oldDebugger))) {
            return oldDebugger;
        } else if ((await fse.pathExists(newDebugger))) {
            return newDebugger;
        }

        throw new Error(localize('vscode-docker.tasks.pythonExt.noDebugger', 'Unable to find the debugger in the Python extension.'));
    }
}
