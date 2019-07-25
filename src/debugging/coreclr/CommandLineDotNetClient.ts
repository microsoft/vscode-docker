/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as crypto from 'crypto';
import * as semver from 'semver';
import { DialogResponses, parseError } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
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
    trustAndExportSslCertificate(projectFile: string, hostExportPath: string, containerExportPath: string): Promise<void>;
}

export class CommandLineDotNetClient implements DotNetClient {
    private static _KnownConfiguredProjects: Set<string> = new Set<string>();

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

    public async trustAndExportSslCertificate(projectFile: string, hostExportPath: string, containerExportPath: string): Promise<void> {
        if (CommandLineDotNetClient._KnownConfiguredProjects.has(projectFile)) {
            return;
        }

        await this.addUserSecretsIfNecessary(projectFile);
        await this.promptAndTrustCertificateIfNecessary();

        const password = this.getRandomHexString(32);

        // Export the certificate
        const exportCommand = `dotnet dev-certs https -ep "${hostExportPath}" -p "${password}"`;
        await this.processProvider.exec(exportCommand, {});

        // Set the password to dotnet user-secrets
        const userSecretsPasswordCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Password "${password}"`;
        await this.processProvider.exec(userSecretsPasswordCommand, {});

        // Cache the project so we don't do this all over again every F5
        CommandLineDotNetClient._KnownConfiguredProjects.add(projectFile);
    }

    private async addUserSecretsIfNecessary(projectFile: string): Promise<void> {
        const contents = await this.fsProvider.readFile(projectFile);

        if (/UserSecretsId/i.test(contents)) {
            return;
        }

        const dotNetVer = await this.getVersion();
        if (semver.gte(dotNetVer, '3.0.0')) {
            const userSecretsInitCommand = `dotnet user-secrets init --project "${projectFile}" --id ${this.getRandomHexString(32)}`;
            await this.processProvider.exec(userSecretsInitCommand, {});
        }
    }

    private async promptAndTrustCertificateIfNecessary(): Promise<void> {
        if (this.osProvider.os !== 'Windows' && !this.osProvider.isMac) {
            // No centralized notion of trust on Linux
            return;
        }

        try {
            const checkCommand = `dotnet dev-certs https --check --trust`;
            await this.processProvider.exec(checkCommand, {});
        } catch (err) {
            const error = parseError(err);

            if (error.errorType === "6" || error.errorType === "7") { // 6 = certificate not found, 7 = certificate not trusted
                if (this.osProvider.os === 'Windows') {
                    const selection = await ext.ui.showWarningMessage(
                        "The ASP.NET Core HTTPS development certificate is not trusted. Would you like to trust the certificate? A prompt may be shown.",
                        { modal: true },
                        DialogResponses.yes, DialogResponses.no);

                    if (selection === DialogResponses.yes) {
                        const trustCommand = `dotnet dev-certs https --trust`;
                        await this.processProvider.exec(trustCommand, {});
                    }
                } else if (this.osProvider.isMac) {
                    await ext.ui.showWarningMessage(
                        "The ASP.NET Core HTTPS development certificate is not trusted. Run `dotnet dev-certs https --trust` to trust the certificate.",
                        { modal: true });
                }
            } else { throw err; }
        }
    }

    private getRandomHexString(length: number): string {
        const buffer: Buffer = crypto.randomBytes(Math.ceil(length / 2));
        return buffer.toString('hex').slice(0, length);
    }
}

export default CommandLineDotNetClient;
