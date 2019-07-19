/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as cp from 'child_process';
import * as semver from 'semver';
import { v4 as uuidv4 } from 'uuid';
import { window } from 'vscode';
import { ProcessProvider } from "./ChildProcessProvider";
import { FileSystemProvider } from "./fsProvider";
import { OSProvider } from "./LocalOSProvider";

export type MSBuildExecOptions = {
    target?: string;
    properties?: { [key: string]: string };
};

export interface DotNetClient {
    execTarget(projectFile: string, options?: MSBuildExecOptions): Promise<void>;
    getVersion(): Promise<string | undefined>;
    exportSslCertificate(projectFile: string, hostExportPath: string, containerExportPath: string): Promise<void>;
}

export class CommandLineDotNetClient implements DotNetClient {
    private static KnownConfiguredProjects: Set<string> = new Set<string>();

    constructor(
        private readonly processProvider: ProcessProvider,
        private readonly fsProvider: FileSystemProvider,
        private readonly osProvider: OSProvider) {
    }

    public async execTarget(projectFile: string, options?: MSBuildExecOptions): Promise<void> {
        let command = `dotnet msbuild "${projectFile}"`;

        if (options) {
            if (options.target) {
                command += ` "/t:${options.target}"`;
            }

            if (options.properties) {
                const properties = options.properties;

                command += Object.keys(properties).map(key => ` "/p:${key}=${properties[key]}"`).join('');
            }
        }

        await this.processProvider.exec(command, {});
    }

    public async getVersion(): Promise<string | undefined> {
        try {

            const command = `dotnet --version`;

            const result = await this.processProvider.exec(command, {});

            return result.stdout.trim();
        } catch {
            return undefined;
        }
    }

    public async exportSslCertificate(projectFile: string, hostExportPath: string, containerExportPath: string): Promise<void> {
        if (CommandLineDotNetClient.KnownConfiguredProjects.has(projectFile)) {
            return;
        }

        await this.addUserSecretsIfNecessary(projectFile);

        if (this.osProvider.os === 'Windows' || this.osProvider.isMac) {
            try {
                // Check if the certificate is already trusted
                const checkCommand = `dotnet dev-certs https --check`;
                await this.processProvider.exec(checkCommand, {});
            } catch {
                // It is not trusted--ask if they want to do so
                window.showWarningMessage(
                    "The ASP.NET Core HTTPS development certificate is not trusted. Would you like to trust the certificate? A prompt may be shown.",
                    { modal: false },
                    ...['Yes', 'No']).then(selection => {
                        if (selection === 'Yes') {
                            const trustCommand = `dotnet dev-certs https --trust`;
                            cp.spawn(trustCommand, { shell: true, windowsHide: false, detached: true });
                        }
                    });
            }
        }

        const password = uuidv4();

        // Export the certificate
        const exportCommand = `dotnet dev-certs https -ep "${hostExportPath}" -p "${password}"`;
        await this.processProvider.exec(exportCommand, {});

        // Set the password to dotnet user-secrets
        const userSecretsPasswordCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Password "${password}"`;
        await this.processProvider.exec(userSecretsPasswordCommand, {});

        // This is not honored due to https://github.com/aspnet/AspNetCore.Docs/issues/6199#issuecomment-418194220
        // Consequently, the certificate name must be equal to <binaryName>.pfx, i.e. MyWebApp.dll => MyWebApp.pfx
        //const userSecretsPathCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Path "${containerExportPath}"`;
        //await this.processProvider.exec(userSecretsPathCommand, {});

        // Cache the project so we don't do this all over again every F5
        CommandLineDotNetClient.KnownConfiguredProjects.add(projectFile);
    }

    private async addUserSecretsIfNecessary(projectFile: string): Promise<void> {
        const contents = await this.fsProvider.readFile(projectFile);

        if (contents.indexOf('UserSecretsId') >= 0) {
            return;
        }

        const dotNetVer = await this.getVersion();
        if (semver.gte(dotNetVer, '3.0.0')) {
            const userSecretsInitCommand = `dotnet user-secrets init --project "${projectFile}" --id ${uuidv4()}`;
            await this.processProvider.exec(userSecretsInitCommand, {});
        }
    }
}

export default CommandLineDotNetClient;
