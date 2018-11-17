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
import { globAsync } from '../helpers/async';
import { isLinux, isMac, isWindows } from '../helpers/osVersion';

let _systemCertificates: (string | Buffer)[] | undefined;

export async function getTrustedCertificates(): Promise<(string | Buffer)[]> {
    // tslint:disable-next-line:no-function-expression
    return callWithTelemetryAndErrorHandling('docker.certificates', async function (this: IActionContext): Promise<(string | Buffer)[]> {
        this.suppressTelemetry = true;

        let useCertificateStore: boolean = !!vscode.workspace.getConfiguration('docker').get<boolean>('useCertificateStore');
        this.properties.useCertStore = String(useCertificateStore);
        let systemCerts: (string | Buffer)[] = useCertificateStore ? getCertificatesFromSystem() : [];

        let certificatePaths: string[] = vscode.workspace.getConfiguration('docker').get<string[] | undefined>('certificatePaths') || [];
        this.properties.certPathsCount = String(certificatePaths.length);
        let filesCerts = certificatePaths ? await getCertificatesFromPaths(certificatePaths) : [];

        this.properties.systemCertsCount = String(systemCerts.length);
        this.properties.fileCertsCount = String(filesCerts.length);

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
                require('win-ca');
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
