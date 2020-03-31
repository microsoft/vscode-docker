/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import * as process from 'process';
import * as request from 'request-promise-native';
import { Memento } from 'vscode';
import { localize } from '../../localize';
import { OSProvider } from '../../utils/LocalOSProvider';
import { NetCoreDebugHelper } from '../netcore/NetCoreDebugHelper';
import { ProcessProvider } from './ChildProcessProvider';
import { FileSystemProvider } from './fsProvider';
import { OutputManager } from './outputManager';

export interface VsDbgClient {
    getVsDbgFolder(): Promise<string>;
    getVsDbgVersion(version: string, runtime: string): Promise<string>;
}

type VsDbgScriptPlatformOptions = {
    name: string;
    url: string;
    getAcquisitionCommand(vsdbgAcquisitionScriptPath: string, version: string, runtime: string, vsdbgVersionPath: string): Promise<string>;
    onScriptAcquired?(path: string): Promise<void>;
};

export class RemoteVsDbgClient implements VsDbgClient {
    private static readonly stateKey: string = 'RemoteVsDbgClient';
    private static readonly winDir: string = 'WINDIR';

    private readonly vsdbgPath: string;
    private readonly options: VsDbgScriptPlatformOptions;

    public constructor(
        private readonly dockerOutputManager: OutputManager,
        private readonly fileSystemProvider: FileSystemProvider,
        private readonly globalState: Memento,
        osProvider: OSProvider,
        private readonly processProvider: ProcessProvider) {
        this.vsdbgPath = NetCoreDebugHelper.getHostDebuggerPathBase();
        this.options = osProvider.os === 'Windows'
            ? {
                name: 'GetVsDbg.ps1',
                url: 'https://aka.ms/getvsdbgps1',
                getAcquisitionCommand: async (vsdbgAcquisitionScriptPath: string, version: string, runtime: string, vsdbgVersionPath: string) => {
                    const powershellCommand = `${process.env[RemoteVsDbgClient.winDir]}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
                    return await Promise.resolve(`${powershellCommand} -NonInteractive -NoProfile -WindowStyle Hidden -ExecutionPolicy RemoteSigned -File \"${vsdbgAcquisitionScriptPath}\" -Version ${version} -RuntimeID ${runtime} -InstallPath \"${vsdbgVersionPath}\"`);
                }
            }
            : {
                name: 'getvsdbg.sh',
                url: 'https://aka.ms/getvsdbgsh',
                getAcquisitionCommand: async (vsdbgAcquisitionScriptPath: string, version: string, runtime: string, vsdbgVersionPath: string) => {
                    return await Promise.resolve(`${vsdbgAcquisitionScriptPath} -v ${version} -r ${runtime} -l \"${vsdbgVersionPath}\"`);
                },
                onScriptAcquired: async (scriptPath: string) => {
                    await this.processProvider.exec(`chmod +x \"${scriptPath}\"`, { cwd: this.vsdbgPath });
                }
            };
    }

    public async getVsDbgFolder(): Promise<string> {
        // NOTE: If non-existant, other processes (e.g. Docker when volume mounting) may attempt to create this folder.
        //       This can lead to "access denied" if those processes run elevated compared to VS Code.
        //       Therefore, ensure it's created before they're ever given the folder name.
        await this.ensureVsDbgFolderExists();

        return this.vsdbgPath;
    }

    public async getVsDbgVersion(version: string, runtime: string): Promise<string> {
        const vsdbgRelativeVersionPath = path.join(runtime, version);
        const vsdbgVersionPath = path.join(this.vsdbgPath, vsdbgRelativeVersionPath);
        const vsdbgVersionExists = await this.fileSystemProvider.dirExists(vsdbgVersionPath);

        if (vsdbgVersionExists && await this.isUpToDate(this.lastDebuggerAcquisitionKey(version, runtime))) {
            // The debugger is up to date...
            return vsdbgRelativeVersionPath;
        }

        return await this.dockerOutputManager.performOperation(
            localize('vscode-docker.debug.coreclr.debugger.acquiring', 'Acquiring the latest .NET Core debugger...'),
            async () => {

                await this.getVsDbgAcquisitionScript();

                const vsdbgAcquisitionScriptPath = path.join(this.vsdbgPath, this.options.name);

                const acquisitionCommand = await this.options.getAcquisitionCommand(vsdbgAcquisitionScriptPath, version, runtime, vsdbgVersionPath);

                this.dockerOutputManager.appendLine(localize('vscode-docker.debug.coreclr.debugger.command', '> Executing: {0} <', acquisitionCommand));
                await this.processProvider.exec(acquisitionCommand, {
                    cwd: this.vsdbgPath, progress: (content) => {
                        this.dockerOutputManager.append(content);
                    }
                });

                await this.updateDate(this.lastDebuggerAcquisitionKey(version, runtime), new Date());

                return vsdbgRelativeVersionPath;
            },
            localize('vscode-docker.debug.coreclr.debugger.acquired', 'Debugger acquired.'),
            localize('vscode-docker.debug.coreclr.debugger.unableToAcquire', 'Unable to acquire the .NET Core debugger.'));
    }

    private async ensureVsDbgFolderExists(): Promise<void> {
        await this.fileSystemProvider.ensureDir(this.vsdbgPath);
    }

    private async getVsDbgAcquisitionScript(): Promise<void> {
        const vsdbgAcquisitionScriptPath = path.join(this.vsdbgPath, this.options.name);
        const acquisitionScriptExists = await this.fileSystemProvider.fileExists(vsdbgAcquisitionScriptPath);

        if (acquisitionScriptExists && await this.isUpToDate(this.lastScriptAcquisitionKey)) {
            // The acquisition script is up to date...
            return;
        }

        await this.ensureVsDbgFolderExists();

        const script = await request(this.options.url);

        await this.fileSystemProvider.writeFile(vsdbgAcquisitionScriptPath, script);

        if (this.options.onScriptAcquired) {
            await this.options.onScriptAcquired(vsdbgAcquisitionScriptPath);
        }

        await this.updateDate(this.lastScriptAcquisitionKey, new Date());
    }

    private async isUpToDate(key: string): Promise<boolean> {
        const lastAcquisitionDate = await this.getDate(key);

        if (lastAcquisitionDate) {
            let aquisitionExpirationDate = new Date(lastAcquisitionDate);

            aquisitionExpirationDate.setDate(lastAcquisitionDate.getDate() + 1);

            if (aquisitionExpirationDate.valueOf() > new Date().valueOf()) {
                // The acquisition is up to date...
                return true;
            }
        }

        return false;
    }

    private get lastScriptAcquisitionKey(): string {
        return `${RemoteVsDbgClient.stateKey}.lastScriptAcquisition`;
    }

    private lastDebuggerAcquisitionKey(version: string, runtime: string): string {
        return `${RemoteVsDbgClient.stateKey}.lastDebuggerAcquisition(${version}, ${runtime})`;
    }

    private async getDate(key: string): Promise<Date | undefined> {
        const dateString = this.globalState.get<string>(key);

        return await Promise.resolve(dateString ? new Date(dateString) : undefined);
    }

    private async updateDate(key: string, timestamp: Date): Promise<void> {
        await this.globalState.update(key, timestamp);
    }
}
