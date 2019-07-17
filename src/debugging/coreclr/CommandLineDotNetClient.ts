/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as semver from 'semver';
import { v4 as uuidv4 } from 'uuid';
import { ProcessProvider } from "./ChildProcessProvider";
import { FileSystemProvider } from "./fsProvider";
import { LocalOSProvider } from "./LocalOSProvider";

export type MSBuildExecOptions = {
    target?: string;
    properties?: { [key: string]: string };
};

export interface DotNetClient {
    execTarget(projectFile: string, options?: MSBuildExecOptions): Promise<void>;
    getVersion(): Promise<string | undefined>;
    trustAndExportCertificate(projectFile: string, hostExportPath: string, containerExportPath: string, password: string): Promise<void>;
}

export class CommandLineDotNetClient implements DotNetClient {
    private static KnownConfiguredProjects: Set<string> = new Set<string>();

    constructor(private readonly processProvider: ProcessProvider, private readonly fsProvider: FileSystemProvider, private readonly osProvider: LocalOSProvider) {
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

    public async trustAndExportCertificate(projectFile: string, hostExportPath: string, containerExportPath: string, password: string): Promise<void> {
        if (CommandLineDotNetClient.KnownConfiguredProjects.has(projectFile)) {
            return;
        }

        await this.addUserSecretsIfNecessary(projectFile);

        // Trust doesn't work for Linux users; need to direct them to manually trust the cert
        const exportCommand = `dotnet dev-certs https ${this.osProvider.os === 'Linux' ? '' : '--trust'} -ep "${hostExportPath}" -p "foobar"`;
        await this.processProvider.exec(exportCommand, {});

        //const userSecretsPasswordCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Password "${password}"`;
        //await this.processProvider.exec(userSecretsPasswordCommand, {});

        CommandLineDotNetClient.KnownConfiguredProjects.add(projectFile);

        // This is not honored due to https://github.com/aspnet/AspNetCore.Docs/issues/6199#issuecomment-418194220
        // Consequently, the certificate name must be equal to <binaryName>.pfx, i.e. MyWebApp.dll => MyWebApp.pfx
        //const userSecretsPathCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Path "${containerExportPath}"`;
        //await this.processProvider.exec(userSecretsPathCommand, {});
    }

    private async addUserSecretsIfNecessary(projectFile: string): Promise<void> {
        const contents = await this.fsProvider.readFile(projectFile);

        if (contents.indexOf('UserSecretsId') >= 0) {
            return;
        }

        const dotNetVer = await this.getVersion();
        if (semver.lt(dotNetVer, '3.0')) {
            throw new Error(`The 'UserSecretsId' MSBuild property is not set in the project file '${projectFile}'. Set it to a unique value, for example a UUID.`);
        }

        const userSecretsInitCommand = `dotnet user-secrets init --project "${projectFile}" --id ${uuidv4()}`;
        await this.processProvider.exec(userSecretsInitCommand, {});
    }
}

export default CommandLineDotNetClient;
