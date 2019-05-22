/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as https from 'https';
import * as path from 'path';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from "vscode-azureextensionui";
import { ext } from '../extensionVariables';
import { globAsync } from './async';
import { isLinux, isMac, isWindows } from './osVersion';

let _systemCertificates: (string | Buffer)[] | undefined;

type ImportCertificatesSetting = boolean | {
    useCertificateStore: boolean,
    certificatePaths: string[]
};

const defaultCertificatePaths: string[] = [
    "/etc/ssl/certs/ca-certificates",
    "/etc/openssl/certs",
    "/etc/pki/tls/certs",
    "/usr/local/share/certs"
];

export async function getTrustedCertificates(): Promise<(string | Buffer)[]> {
    return callWithTelemetryAndErrorHandling('docker.certificates', async (context: IActionContext) => {
        context.telemetry.suppressIfSuccessful = true;

        let importSetting = vscode.workspace.getConfiguration('docker').get<ImportCertificatesSetting>('importCertificates');

        // If value is false or null/undefined or anything not an object or boolean...
        if (!importSetting || (typeof importSetting !== "object" && typeof importSetting !== "boolean")) {
            // ... then use default Node.js behavior
            context.telemetry.properties.importCertificates = 'false';
            return undefined;
        }

        let useCertificateStore: boolean;
        let certificatePaths: string[];

        if (importSetting === true) {
            context.telemetry.properties.importCertificates = 'true';
            useCertificateStore = true;
            certificatePaths = defaultCertificatePaths;
        } else {
            context.telemetry.properties.importCertificates = 'custom';
            useCertificateStore = !!importSetting.useCertificateStore;
            certificatePaths = importSetting.certificatePaths || [];
        }

        context.telemetry.properties.useCertStore = String(useCertificateStore);
        let systemCerts: (string | Buffer)[] = useCertificateStore ? getCertificatesFromSystem() : [];

        let filesCerts: Buffer[];
        context.telemetry.properties.certPathsCount = String(certificatePaths.length);
        filesCerts = await getCertificatesFromPaths(certificatePaths);

        context.telemetry.properties.systemCertsCount = String(systemCerts.length);
        context.telemetry.properties.fileCertsCount = String(filesCerts.length);

        let certificates = systemCerts;
        certificates.push(...filesCerts);

        return certificates;
    });
}

async function getCertificatesFromPaths(paths: string[]): Promise<Buffer[]> {
    let certs: Buffer[] = [];

    for (let certPath of paths) {
        if (!path.isAbsolute(certPath)) {
            // tslint:disable-next-line: no-floating-promises
            ext.ui.showWarningMessage(`Certificate path "${certPath}" is not an absolute path, ignored.`);
        } else {
            let isFile = false;
            let isFolder = false;
            try {
                if (await fse.pathExists(certPath)) {
                    let stat = await fse.stat(certPath);
                    isFolder = stat.isDirectory();
                    isFile = stat.isFile();
                }
            } catch {
                // Ignore (could be permission issues, for instance)
            }

            let certFiles: string[] = [];
            if (isFolder) {
                let files = await globAsync('**', { absolute: true, nodir: true, cwd: certPath });
                certFiles.push(...files);
            } else if (isFile) {
                certFiles.push(certPath);
            } else {
                console.log(`Could not find certificate path "${certPath}.`);
            }

            for (let cf of certFiles) {
                certs.push(fse.readFileSync(cf));
            }
        }
    }

    return certs;
}

function getCertificatesFromSystem(): (string | Buffer)[] {
    if (!_systemCertificates) {
        // {win,mac}-ca automatically read trusted certificate authorities from the system and place them into the global
        //   Node agent. We don't want them in the global agent because that will affect all other extensions
        //   loaded in the same process, which will make them behave inconsistently depending on whether we're loaded.
        let previousCertificateAuthorities = https.globalAgent.options.ca;
        let certificates: string | Buffer | (string | Buffer)[] = [];

        try {
            if (isWindows()) {
                // Use win-ca fallback logic since nAPI isn't currently compatible with Electron
                // (https://github.com/ukoloff/win-ca/issues/12, https://www.npmjs.com/package/win-ca#availability)
                require('win-ca/fallback');
            } else if (isMac()) {
                require('mac-ca');
            } else if (isLinux()) {
            }
        } finally {
            certificates = https.globalAgent.options.ca;
            https.globalAgent.options.ca = previousCertificateAuthorities;
        }

        if (!certificates) {
            certificates = [];
        } else if (!Array.isArray(certificates)) {
            certificates = [certificates];
        }

        _systemCertificates = certificates;
    }

    return _systemCertificates;
}
