/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { ProcessProvider } from "./ChildProcessProvider";

export type MSBuildExecOptions = {
    target?: string;
    properties?: { [key: string]: string };
};

export interface DotNetClient {
    execTarget(projectFile: string, options?: MSBuildExecOptions): Promise<void>;
    getVersion(): Promise<string | undefined>;
    trustAndExportCertificate(projectFile: string, exportPath: string, password: string): Promise<void>;
}

export class CommandLineDotNetClient implements DotNetClient {
    constructor(private readonly processProvider: ProcessProvider) {
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

    public async trustAndExportCertificate(projectFile: string, exportPath: string, password: string): Promise<void> {
        const exportCommand = `dotnet dev-certs https --trust -ep "${exportPath}" -p "${password}"`;
        await this.processProvider.exec(exportCommand, {});

        const userSecretsPasswordCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Password "${password}"`;
        await this.processProvider.exec(userSecretsPasswordCommand, {});

        const userSecretsPathCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Path "${exportPath}"`;
        await this.processProvider.exec(userSecretsPathCommand, {});
    }
}

export default CommandLineDotNetClient;
