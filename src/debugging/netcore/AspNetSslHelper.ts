/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { IActionContext, parseError } from '@microsoft/vscode-azext-utils';
import { isMac, isWindows } from '../../utils/osUtils';
import { MessageItem } from 'vscode';
import { localize } from '../../localize';
import { cryptoUtils } from '../../utils/cryptoUtils';
import { execAsync } from '../../utils/spawnAsync';
import { PlatformOS } from '../../utils/platform';

const knownConfiguredProjects = new Set<string>();
let alreadyTrustedOrSkipped: boolean = false;

export async function trustCertificateIfNecessary(context: IActionContext): Promise<void> {
    if (alreadyTrustedOrSkipped) {
        return;
    }

    if (isWindows()) {
        if (!(await isCertificateTrusted())) {
            const trust: MessageItem = { title: localize('vscode-docker.debugging.netCore.trust', 'Trust') };
            const message = localize('vscode-docker.debugging.netCore.notTrusted', 'The ASP.NET Core HTTPS development certificate is not trusted. To trust the certificate, run `dotnet dev-certs https --trust`, or click "Trust" below.');

            // Don't wait
            void context.ui
                .showWarningMessage(message, { modal: false, learnMoreLink: 'https://aka.ms/vscode-docker-dev-certs' }, trust)
                .then(async selection => {
                    if (selection === trust) {
                        await execAsync('dotnet dev-certs https --trust');
                        knownConfiguredProjects.clear(); // Clear the cache so future F5's will not use an untrusted cert
                    }
                });
        }
    } else if (isMac()) {
        if (!(await isCertificateTrusted())) {
            const message = localize('vscode-docker.debugging.netCore.notTrustedRunManual', 'The ASP.NET Core HTTPS development certificate is not trusted. To trust the certificate, run `dotnet dev-certs https --trust`.');

            // Don't wait
            void context.ui.showWarningMessage(
                message,
                { modal: false, learnMoreLink: 'https://aka.ms/vscode-docker-dev-certs' });
        }
    }

    alreadyTrustedOrSkipped = true;
}

export async function exportCertificateIfNecessary(projectFile: string, certificateExportPath: string): Promise<void> {
    if (knownConfiguredProjects.has(projectFile)) {
        return;
    }

    await exportCertificate(projectFile, certificateExportPath);
    knownConfiguredProjects.add(projectFile);
}

export function getHostSecretsFolders(): { hostCertificateFolder: string, hostUserSecretsFolder: string } {
    let appDataEnvironmentVariable: string | undefined;

    if (isWindows()) {
        appDataEnvironmentVariable = process.env.AppData;

        if (appDataEnvironmentVariable === undefined) {
            throw new Error(localize('vscode-docker.debug.coreclr.sslManager.appDataUndefined', 'The environment variable \'AppData\' is not defined. This variable is used to locate the HTTPS certificate and user secrets folders.'));
        }
    }

    return {
        hostCertificateFolder: isWindows() ?
            path.join(appDataEnvironmentVariable, 'ASP.NET', 'Https') :
            path.join(os.homedir(), '.aspnet', 'https'),
        hostUserSecretsFolder: isWindows() ?
            path.join(appDataEnvironmentVariable, 'Microsoft', 'UserSecrets') :
            path.join(os.homedir(), '.microsoft', 'usersecrets'),
    };
}

export function getContainerSecretsFolders(platform: PlatformOS, userName: string | undefined): { containerCertificateFolder: string, containerUserSecretsFolder: string } {
    // If username is undefined, assume 'ContainerUser' for Windows and 'root' for Linux, these are the defaults for .NET
    userName = userName || (platform === 'Windows' ? 'ContainerUser' : 'root');

    // On Windows, the user home directory is at C:\Users\<username>. On Linux, it's /root for root, otherwise /home/<username>
    const userHome = platform === 'Windows' ?
        path.win32.join('C:\\Users', userName) :
        userName === 'root' ? '/root' : path.posix.join('/home', userName);

    return {
        containerCertificateFolder: platform === 'Windows' ?
            path.win32.join(userHome, 'AppData\\Roaming\\ASP.NET\\Https') :
            path.posix.join(userHome, '.aspnet/https'),
        containerUserSecretsFolder: platform === 'Windows' ?
            path.win32.join(userHome, 'AppData\\Roaming\\Microsoft\\UserSecrets') :
            path.posix.join(userHome, '.microsoft/usersecrets'),
    };
}

async function isCertificateTrusted(): Promise<boolean> {
    try {
        await execAsync('dotnet dev-certs https --check --trust');
        return true;
    } catch (err) {
        const error = parseError(err);

        if (error.errorType === '6' || error.errorType === '7') {
            return false;
        } else {
            throw err;
        }
    }
}

async function exportCertificate(projectFile: string, certificateExportPath: string): Promise<void> {
    await addUserSecretsIfNecessary(projectFile);
    await exportCertificateAndSetPassword(projectFile, certificateExportPath);
}

async function addUserSecretsIfNecessary(projectFile: string): Promise<void> {
    const contents = await fse.readFile(projectFile, 'utf-8');

    if (/UserSecretsId/i.test(contents)) {
        return;
    }

    // Initialize user secrets for the project
    const userSecretsInitCommand = `dotnet user-secrets init --project "${projectFile}" --id ${cryptoUtils.getRandomHexString(32)}`;
    await execAsync(userSecretsInitCommand);
}

async function exportCertificateAndSetPassword(projectFile: string, certificateExportPath: string): Promise<void> {
    const password = cryptoUtils.getRandomHexString(32);

    // Export the certificate
    const exportCommand = `dotnet dev-certs https -ep "${certificateExportPath}" -p "${password}"`;
    await execAsync(exportCommand);

    // Set the password to dotnet user-secrets
    const userSecretsPasswordCommand = `dotnet user-secrets --project "${projectFile}" set Kestrel:Certificates:Development:Password "${password}"`;
    await execAsync(userSecretsPasswordCommand);
}


