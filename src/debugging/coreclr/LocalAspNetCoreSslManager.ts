/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { MessageItem } from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { PlatformOS } from '../../utils/platform';
import { quickPickProjectFileItem } from '../../utils/quickPickFile';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';
import { ProcessProvider } from './ChildProcessProvider';
import { DotNetClient, TrustState } from './CommandLineDotNetClient';
import { OSProvider } from './LocalOSProvider';
import { NetCoreProjectProvider } from './netCoreProjectProvider';

export type SecretsFolders = {
    certificateFolder: string;
    userSecretsFolder: string;
}

export interface AspNetCoreSslManager {
    trustCertificateIfNecessary(): Promise<void>;
    exportCertificateIfNecessary(projectFile: string | undefined, certificateExportPath: string | undefined): Promise<void>;
}

export class LocalAspNetCoreSslManager implements AspNetCoreSslManager {

    private static _KnownConfiguredProjects: Set<string> = new Set<string>();
    private static _CertificateTrustedOrSkipped: boolean = false;

    public constructor(
        private readonly dotNetClient: DotNetClient,
        private readonly netCoreProjectProvider: NetCoreProjectProvider,
        private readonly processProvider: ProcessProvider,
        private readonly osProvider: OSProvider) {
    }

    public async trustCertificateIfNecessary(): Promise<void> {
        if (LocalAspNetCoreSslManager._CertificateTrustedOrSkipped) {
            return;
        }

        const trusted = await this.dotNetClient.isCertificateTrusted();

        if (trusted === TrustState.Trusted || trusted === TrustState.NotApplicable) {
            LocalAspNetCoreSslManager._CertificateTrustedOrSkipped = true;
            return;
        }

        if (this.osProvider.os === 'Windows') {
            const trust: MessageItem = { title: localize('vscode-docker.debug.coreclr.sslManager.trust', 'Trust') };
            const message = localize('vscode-docker.debug.coreclr.sslManager.notTrusted', 'The ASP.NET Core HTTPS development certificate is not trusted. To trust the certificate, run \`dotnet dev-certs https --trust\`, or click "Trust" below.');

            // Don't wait
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            ext.ui.showWarningMessage(
                message,
                { modal: false, learnMoreLink: 'https://aka.ms/vscode-docker-dev-certs' },
                trust).then(async selection => {
                if (selection === trust) {
                    const trustCommand = `dotnet dev-certs https --trust`;
                    await this.processProvider.exec(trustCommand, {});
                    LocalAspNetCoreSslManager._KnownConfiguredProjects.clear(); // Clear the cache so future F5's will not use an untrusted cert
                }});
        } else if (this.osProvider.isMac) {
            const message = localize('vscode-docker.debug.coreclr.sslManager.notTrustedRunManual', 'The ASP.NET Core HTTPS development certificate is not trusted. To trust the certificate, run \`dotnet dev-certs https --trust\`.');

            // Don't wait
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            ext.ui.showWarningMessage(
                message,
                { modal: false, learnMoreLink: 'https://aka.ms/vscode-docker-dev-certs' });
        }

        LocalAspNetCoreSslManager._CertificateTrustedOrSkipped = true;
    }

    public async exportCertificateIfNecessary(projectFile: string | undefined, certificateExportPath: string | undefined): Promise<void> {
        projectFile = projectFile || await this.pickProjectFile();

        if (LocalAspNetCoreSslManager._KnownConfiguredProjects.has(projectFile)) {
            return;
        }

        certificateExportPath = certificateExportPath || await this.getCertificateExportPath(projectFile);

        await this.dotNetClient.exportCertificate(projectFile, certificateExportPath);
        LocalAspNetCoreSslManager._KnownConfiguredProjects.add(projectFile)
    }

    public static getHostSecretsFolders(): SecretsFolders {
        let appDataEnvironmentVariable: string | undefined;

        if (os.platform() === 'win32') {
            appDataEnvironmentVariable = process.env.AppData;

            if (appDataEnvironmentVariable === undefined) {
                throw new Error(localize('vscode-docker.debug.coreclr.sslManager.appDataUndefined', 'The environment variable \'AppData\' is not defined. This variable is used to locate the HTTPS certificate and user secrets folders.'));
            }
        }

        return {
            certificateFolder: os.platform() === 'win32' ?
                path.join(appDataEnvironmentVariable, 'ASP.NET', 'Https') :
                path.join(os.homedir(), '.aspnet', 'https'),
            userSecretsFolder: os.platform() === 'win32' ?
                path.join(appDataEnvironmentVariable, 'Microsoft', 'UserSecrets') :
                path.join(os.homedir(), '.microsoft', 'usersecrets'),
        };
    }

    public static getContainerSecretsFolders(platform: PlatformOS): SecretsFolders {
        return {
            certificateFolder: platform === 'Windows' ?
                'C:\\Users\\ContainerUser\\AppData\\Roaming\\ASP.NET\\Https' :
                '/root/.aspnet/https',
            userSecretsFolder: platform === 'Windows' ?
                'C:\\Users\\ContainerUser\\AppData\\Roaming\\Microsoft\\UserSecrets' :
                '/root/.microsoft/usersecrets',
        };
    }

    private async pickProjectFile(): Promise<string> {
        const workspaceFolder = await quickPickWorkspaceFolder(localize('vscode-docker.debug.coreclr.sslManager.workspaceFolder', 'To configure SSL for an ASP.NET Core project you must first open a folder or workspace in VSCode.'));
        const projectItem = await quickPickProjectFileItem(undefined, workspaceFolder, localize('vscode-docker.debug.coreclr.sslManager.noCsproj', 'No .NET Core project file (.csproj or .fsproj) could be found.'));

        return projectItem.absoluteFilePath;
    }

    private async getCertificateExportPath(projectFile: string): Promise<string> {
        const assemblyName = path.parse(await this.netCoreProjectProvider.getTargetPath(projectFile)).name;
        return path.join(LocalAspNetCoreSslManager.getHostSecretsFolders().certificateFolder, `${assemblyName}.pfx`);
    }
}
