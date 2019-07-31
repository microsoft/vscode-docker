/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import { ConfigurationTarget, MessageItem, workspace, WorkspaceConfiguration } from 'vscode';
import { DialogResponses } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { PlatformOS } from '../../utils/platform';
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

        const config: WorkspaceConfiguration = workspace.getConfiguration('docker');
        if (!config.get<boolean>('promptToTrustAspNetCoreCertificate')) {
            return;
        }

        const trusted: boolean | undefined = await this.dotNetClient.isCertificateTrusted();

        if (trusted === undefined || trusted) {
            LocalAspNetCoreSslManager._CertificateTrustedOrSkipped = true;
            return;
        }

        const trust: MessageItem = { title: 'Trust' };
        const prompt = this.osProvider.os === 'Windows' ? 'A prompt may be shown.' : 'You may be prompted for your login password.';
        const message = `The ASP.NET Core HTTPS development certificate is not trusted. Would you like to trust the certificate? ${prompt}`;

        const selection = await ext.ui.showWarningMessage(
            message,
            { modal: true, learnMoreLink: 'https://aka.ms/vscode-docker-dev-certs' },
            trust, DialogResponses.skipForNow, DialogResponses.dontWarnAgain);

        if (selection === trust) {
            const trustCommand = `${this.osProvider.os === 'Windows' ? '' : 'sudo -S '}dotnet dev-certs https --trust`;
            let attempts = 0;

            await this.processProvider.exec(trustCommand, {
                progress: async (output, process) => {
                    if (this.osProvider.os === 'Windows') {
                        return;
                    }

                    if (/Password:/i.test(output)) {
                        const passwordPrompt = attempts++ < 1 ? 'Please enter your login password.' : 'Sorry, please enter your login password again.';
                        const password = await ext.ui.showInputBox({ prompt: passwordPrompt, password: true });
                        process.stdin.write(password);
                        process.stdin.write(os.EOL);
                    }
                }
            });
        } else if (selection === DialogResponses.dontWarnAgain) {
            await config.update('promptToTrustAspNetCoreCertificate', false, ConfigurationTarget.Global);
        }

        LocalAspNetCoreSslManager._CertificateTrustedOrSkipped = true;
    }

    public async exportCertificateIfNecessary(projectFile: string | undefined, certificateExportPath: string | undefined): Promise<void> {
        projectFile = projectFile || await this.pickProjectFile();

        if (LocalAspNetCoreSslManager._KnownConfiguredProjects.has(projectFile)) {
            return;
        }

        certificateExportPath = certificateExportPath || await this.netCoreProjectProvider.getTargetPath(projectFile);

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
        // TODO
        return '';
    }
}

export default LocalAspNetCoreSslManager;
