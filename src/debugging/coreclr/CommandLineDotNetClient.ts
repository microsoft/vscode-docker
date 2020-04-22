/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as semver from 'semver';
import { parseError } from 'vscode-azureextensionui';
import { OSProvider } from "../../utils/LocalOSProvider";
import { randomUtils } from '../../utils/randomUtils';
import { ProcessProvider } from "./ChildProcessProvider";
import { FileSystemProvider } from "./fsProvider";

export type MSBuildExecOptions = {
    target?: string;
    properties?: { [key: string]: string };
};

export enum TrustState {
    Trusted,
    NotTrusted,
    NotApplicable
}

export const UserSecretsRegex = /UserSecretsId/i;

export interface DotNetClient {
    execTarget(projectFile: string, options?: MSBuildExecOptions): Promise<void>;
    getVersion(): Promise<string | undefined>;
    isCertificateTrusted(): Promise<TrustState>;
    exportCertificate(projectFile: string, certificateExportPath: string): Promise<void>;
}

export class CommandLineDotNetClient implements DotNetClient {
    public constructor(
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

    public async isCertificateTrusted(): Promise<TrustState> {
        if (this.osProvider.os === 'Linux') {
            // No centralized notion of trust on Linux
            return TrustState.NotApplicable;
        }

        try {
            const checkCommand = `dotnet dev-certs https --check --trust`;
            await this.processProvider.exec(checkCommand, {});
            return TrustState.Trusted;
        } catch (err) {
            const error = parseError(err);
            if (error.errorType === '6' || error.errorType === '7') {
                return TrustState.NotTrusted;
            } else { throw err; }
        }
    }

    public async exportCertificate(projectFile: string, certificateExportPath: string): Promise<void> {
        await this.addUserSecretsIfNecessary(projectFile);
        await this.exportCertificateAndSetPassword(projectFile, certificateExportPath);
    }

    private async addUserSecretsIfNecessary(projectFile: string): Promise<void> {
        const contents = await this.fsProvider.readFile(projectFile);

        if (UserSecretsRegex.test(contents)) {
            return;
        }

        const dotNetVer = await this.getVersion();
        if (semver.gte(dotNetVer, '3.0.0')) {
            // The dotnet 3.0 CLI has `dotnet user-secrets init`, let's use that if possible
            const userSecretsInitCommand = `dotnet user-secrets init --project "${projectFile}" --id ${randomUtils.getRandomHexString(32)}`;
            await this.processProvider.exec(userSecretsInitCommand, {});
        } else {
            // Otherwise try to manually edit the project file by adding a property group immediately after the <Project> tag
            // Allowing for leading and trailing whitespace, as well as XML attributes, this regex matches the <Project> tag as long as it is alone on its line
            const projectTagRegex = /^[ \t]*<Project.*>[ \t]*$/im;

            const matches = contents.match(projectTagRegex);
            if (matches && matches[0]) {
                // If found, add the new property group immediately after
                const propertyGroup = `
  <PropertyGroup>
    <UserSecretsId>${randomUtils.getRandomHexString(32)}</UserSecretsId>
  </PropertyGroup>`;
                const newContents = contents.replace(matches[0], matches[0] + propertyGroup);
                await this.fsProvider.writeFile(projectFile, newContents);
            }
        }
    }

    private async exportCertificateAndSetPassword(projectFile: string, certificateExportPath: string): Promise<void> {
        const password = randomUtils.getRandomHexString(32);

        // Export the certificate
        const exportCommand = `dotnet dev-certs https -ep "${certificateExportPath}" -p "${password}"`;
        await this.processProvider.exec(exportCommand, {});

        // Set the password to dotnet user-secrets
        const userSecretsPasswordCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Password "${password}"`;
        await this.processProvider.exec(userSecretsPasswordCommand, {});
    }
}

export default CommandLineDotNetClient;
