/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as semver from 'semver';
import { MessageItem } from 'vscode';
import { IActionContext, parseError } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { cryptoUtils } from '../../utils/cryptoUtils';
import { getDotNetVersion } from '../../utils/netCoreUtils';
import { isMac, isWindows } from '../../utils/osUtils';
import { PlatformOS } from '../../utils/platform';
import { execAsync } from '../../utils/spawnAsync';

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

    const dotNetVer = await getDotNetVersion();
    if (semver.gte(dotNetVer, '3.0.0')) {
        // The dotnet 3.0 CLI has `dotnet user-secrets init`, let's use that if possible
        const userSecretsInitCommand = `dotnet user-secrets init --project "${projectFile}" --id ${cryptoUtils.getRandomHexString(32)}`;
        await execAsync(userSecretsInitCommand);
    } else {
        // Otherwise try to manually edit the project file by adding a property group immediately after the <Project> tag
        // Allowing for leading and trailing whitespace, as well as XML attributes, this regex matches the <Project> tag as long as it is alone on its line
        const projectTagRegex = /^[ \t]*<Project.*>[ \t]*$/im;

        const matches = contents.match(projectTagRegex);
        if (matches && matches[0]) {
            // If found, add the new property group immediately after
            const propertyGroup = `
<PropertyGroup>
  <UserSecretsId>${cryptoUtils.getRandomHexString(32)}</UserSecretsId>
</PropertyGroup>`;
            const newContents = contents.replace(matches[0], matches[0] + propertyGroup);
            await fse.writeFile(projectFile, newContents);
        }
    }
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


