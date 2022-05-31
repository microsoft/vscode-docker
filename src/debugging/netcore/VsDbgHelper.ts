/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { streamToFile } from '../../utils/httpRequest';
import { isWindows } from '../../utils/osUtils';
import { execAsync } from '../../utils/spawnAsync';

type VsDbgVersion = 'latest'; // There are other versions but we don't use them
type VsDbgRuntime = 'linux-x64' | 'linux-musl-x64' | 'linux-arm64' | 'linux-musl-arm64' | 'win7-x64';

const scriptAcquiredDateKey = 'vscode-docker.vsdbgHelper.scriptAcquiredDate';
const scriptExecutedDateKeyPrefix = 'vscode-docker.vsdbgHelper.scriptExecutedDate';
const dayInMs = 24 * 60 * 60 * 1000;

export const vsDbgInstallBasePath = path.join(os.homedir(), '.vsdbg');

const acquisition: { url: string, scriptPath: string, getShellCommand(runtime: VsDbgRuntime, version: VsDbgVersion): string; } =
    isWindows() ?
        {
            url: 'https://aka.ms/getvsdbgps1',
            scriptPath: path.join(vsDbgInstallBasePath, 'GetVsDbg.ps1'),
            getShellCommand: (runtime: VsDbgRuntime, version: VsDbgVersion) => {
                return `powershell -NonInteractive -NoProfile -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File "${acquisition.scriptPath}" -Version ${version} -RuntimeID ${runtime} -InstallPath "${getInstallDirectory(runtime, version)}"`;
            }
        } :
        {
            url: 'https://aka.ms/getvsdbgsh',
            scriptPath: path.join(vsDbgInstallBasePath, 'getvsdbg.sh'),
            getShellCommand: (runtime: VsDbgRuntime, version: VsDbgVersion) => {
                return `chmod +x "${acquisition.scriptPath}" && "${acquisition.scriptPath}" -u -v ${version} -r ${runtime} -l "${getInstallDirectory(runtime, version)}"`;
            }
        };

function getInstallDirectory(runtime: VsDbgRuntime, version: VsDbgVersion): string {
    return path.join(vsDbgInstallBasePath, runtime, version);
}

export interface VsDbgType {
    runtime: VsDbgRuntime,
    version: VsDbgVersion
}

export async function installDebuggersIfNecessary(debuggers: VsDbgType[]): Promise<void> {
    if (!(await fse.pathExists(vsDbgInstallBasePath))) {
        await fse.mkdir(vsDbgInstallBasePath);
    }

    const newScript = await getLatestAcquisitionScriptIfNecessary();

    await Promise.all(debuggers.map(d => executeAcquisitionScriptIfNecessary(d.runtime, d.version, newScript)));
}

async function getLatestAcquisitionScriptIfNecessary(): Promise<boolean> {
    const lastAcquired = ext.context.globalState.get<number | undefined>(scriptAcquiredDateKey, undefined);

    if (lastAcquired && Date.now() - lastAcquired < dayInMs && await fse.pathExists(acquisition.scriptPath)) {
        // Acquired recently, no need to reacquire
        return false;
    }

    ext.outputChannel.appendLine(localize('vscode-docker.debugging.netCore.vsDbgHelper.acquiringScript', 'Acquiring latest VsDbg install script...'));
    await streamToFile(acquisition.url, acquisition.scriptPath);

    await ext.context.globalState.update(scriptAcquiredDateKey, Date.now());
    ext.outputChannel.appendLine(localize('vscode-docker.debugging.netCore.vsDbgHelper.scriptAcquired', 'Script acquired.'));
    return true;
}

async function executeAcquisitionScriptIfNecessary(runtime: VsDbgRuntime, version: VsDbgVersion, newScript: boolean): Promise<void> {
    const scriptExecutedDateKey = `${scriptExecutedDateKeyPrefix}.${runtime}.${version}`;

    const lastExecuted = ext.context.globalState.get<number | undefined>(scriptExecutedDateKey, undefined);

    if (!newScript && lastExecuted && Date.now() - lastExecuted < dayInMs && await fse.pathExists(getInstallDirectory(runtime, version))) {
        // Executed recently, no need to reexecute
        return;
    }

    const command = acquisition.getShellCommand(runtime, version);

    ext.outputChannel.appendLine(localize('vscode-docker.debugging.netCore.vsDbgHelper.installingDebugger', 'Installing VsDbg, Runtime = {0}, Version = {1}...', runtime, version));
    ext.outputChannel.appendLine(command);

    await execAsync(command, {}, (output: string) => {
        ext.outputChannel.append(output);
    });

    await ext.context.globalState.update(scriptExecutedDateKey, Date.now());
    ext.outputChannel.appendLine(localize('vscode-docker.debugging.netCore.vsDbgHelper.debuggerInstalled', 'VsDbg installed, Runtime = {0}, Version = {1}...', runtime, version));
}
