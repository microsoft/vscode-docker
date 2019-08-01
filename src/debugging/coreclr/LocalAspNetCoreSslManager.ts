/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { MessageItem } from 'vscode';
import { ext } from '../../extensionVariables';
import { PlatformOS } from '../../utils/platform';
import { quickPickProjectFileItem } from '../../utils/quick-pick-file';
import { quickPickWorkspaceFolder } from '../../utils/quickPickWorkspaceFolder';
import { ProcessProvider } from './ChildProcessProvider';
import { DotNetClient } from './CommandLineDotNetClient';
import { OSProvider } from './LocalOSProvider';
import { NetCoreProjectProvider } from './netCoreProjectProvider';

export type HostSecretsFolders = {
    certificateFolder: string;
    userSecretsFolder: string;
}

export type ContainerSecretsFolders = {
    certificateFolder: string;
    userSecretsFolder: string;
}

export interface AspNetCoreSslManager {
    trustCertificateIfNecessary(): Promise<void>;
    exportCertificateIfNecessary(projectFile: string | undefined, certificateExportPath: string | undefined): Promise<void>;
    getHostSecretsFolders(): HostSecretsFolders;
    getContainerSecretsFolders(platform: PlatformOS): ContainerSecretsFolders;
}

export class LocalAspNetCoreSslManager implements AspNetCoreSslManager {

    private static _KnownConfiguredProjects: Set<string> = new Set<string>();
    private static _CertificateTrustedOrSkipped: boolean = false;

    constructor(
        private readonly dotNetClient: DotNetClient,
        private readonly netCoreProjectProvider: NetCoreProjectProvider,
        private readonly processProvider: ProcessProvider,
        private readonly osProvider: OSProvider) {
    }

    public async trustCertificateIfNecessary(): Promise<void> {
        if (LocalAspNetCoreSslManager._CertificateTrustedOrSkipped) {
            return;
        }

        const trusted: boolean | undefined = await this.dotNetClient.isCertificateTrusted();

        if (trusted === undefined || trusted) {
            LocalAspNetCoreSslManager._CertificateTrustedOrSkipped = true;
            return;
        }

        const isWindows: boolean = this.osProvider.os === 'Windows';

        const trust: MessageItem = { title: 'Trust' };
        let message = 'The ASP.NET Core HTTPS development certificate is not trusted. Your browser may show warnings about the site when opened. To trust the certificate, run \`dotnet dev-certs https --trust\`.';
        if (isWindows) {
            message += ' Click "Trust" to run this command automatically. You may be prompted to trust the certificate.';
        }

        const selection = await ext.ui.showWarningMessage(
            message,
            { modal: false, learnMoreLink: 'https://aka.ms/vscode-docker-dev-certs' },
            isWindows ? trust : undefined);

        if (isWindows && selection === trust) {
            const trustCommand = `dotnet dev-certs https --trust`;
            await this.processProvider.exec(trustCommand, {});
            LocalAspNetCoreSslManager._KnownConfiguredProjects.clear(); // Clear the cache so future F5's will not use an untrusted cert
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

    public getHostSecretsFolders(): HostSecretsFolders {
        let appDataEnvironmentVariable: string | undefined;

        if (this.osProvider.os === 'Windows') {
            appDataEnvironmentVariable = this.processProvider.env.AppData;

            if (appDataEnvironmentVariable === undefined) {
                throw new Error(`The environment variable \'AppData\' is not defined. This variable is used to locate the HTTPS certificate and user secrets folders.`);
            }
        }

        return {
            certificateFolder: this.osProvider.os === 'Windows' ?
                path.join(appDataEnvironmentVariable, 'ASP.NET', 'Https') :
                path.join(this.osProvider.homedir, '.aspnet', 'https'),
            userSecretsFolder: this.osProvider.os === 'Windows' ?
                path.join(appDataEnvironmentVariable, 'Microsoft', 'UserSecrets') :
                path.join(this.osProvider.homedir, '.microsoft', 'usersecrets'),
        };
    }

    public getContainerSecretsFolders(platform: PlatformOS): ContainerSecretsFolders {
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
        const workspaceFolder = await quickPickWorkspaceFolder("To configure SSL for an ASP.NET Core project you must first open a folder or workspace in VSCode.");
        const projectItem = await quickPickProjectFileItem(undefined, workspaceFolder, "No project files were found.");

        return projectItem.absoluteFilePath;
    }

    private async getCertificateExportPath(projectFile: string): Promise<string> {
        const assemblyName = path.parse(await this.netCoreProjectProvider.getTargetPath(projectFile)).name;
        return path.join(this.getHostSecretsFolders().certificateFolder, `${assemblyName}.pfx`);
    }
}

export default LocalAspNetCoreSslManager;
