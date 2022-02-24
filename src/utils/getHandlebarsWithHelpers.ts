/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import type * as Handlebars from 'handlebars'; // These are only dev-time imports so don't need to be lazy
import { ScaffoldingWizardContext } from '../scaffolding/wizard/ScaffoldingWizardContext';
import { DockerExtensionKind, getVSCodeRemoteInfo } from './getVSCodeRemoteInfo';
import { isWindows } from './osUtils';
import { pathNormalize } from './pathNormalize';
import { PlatformOS } from './platform';
import { getHandlebars } from './lazyPackages';

let handlebars: typeof import('handlebars') | undefined;
export async function getHandlebarsWithHelpers(): Promise<typeof Handlebars> {
    if (!handlebars) {
        handlebars = await getHandlebars();

        handlebars.registerHelper('workspaceRelative', (wizardContext: ScaffoldingWizardContext, absolutePath: string, platform: PlatformOS = 'Linux') => {
            const workspaceFolder: vscode.WorkspaceFolder = wizardContext.workspaceFolder;

            return pathNormalize(
                path.relative(workspaceFolder.uri.fsPath, absolutePath),
                platform
            );
        });

        handlebars.registerHelper('contextRelative', (wizardContext: ScaffoldingWizardContext, absolutePath: string, platform: PlatformOS = 'Linux') => {
            return pathNormalize(
                path.relative(wizardContext.dockerBuildContext, absolutePath),
                platform
            );
        });

        handlebars.registerHelper('eq', (a: string, b: string) => {
            return a === b;
        });

        handlebars.registerHelper('basename', (a: string) => {
            return path.basename(a);
        });

        handlebars.registerHelper('dirname', (a: string, platform: PlatformOS = 'Linux') => {
            return pathNormalize(
                path.dirname(a),
                platform
            );
        });

        handlebars.registerHelper('toQuotedArray', (arr: string[]) => {
            return `[${arr.map(a => `"${a}"`).join(', ')}]`;
        });

        handlebars.registerHelper('isRootPort', (ports: number[]) => {
            return ports?.some(p => p < 1024);
        });

        handlebars.registerHelper('join', (a: never[] | undefined, b: never[] | undefined) => {
            if (!a) {
                return b;
            } else if (!b) {
                return a;
            } else {
                return a.concat(b);
            }
        });

        handlebars.registerHelper('substr', (a: string, from: number, length?: number | unknown) => {
            // If length is unspecified, it has a weird function value which we should treat as undefined
            return a.substr(from, typeof length === 'number' && Number.isInteger(length) ? length : undefined);
        });

        handlebars.registerHelper('friendlyBindHost', (hostPath: string) => {
            // Bind mount host paths are ugly on Windows, e.g. /run/desktop/mnt/host/c/Path/To/Folder
            // Let's make it nicer
            if (isWindows()) {
                const match = /\/run\/desktop\/mnt\/host\/(?<driveLetter>[a-z])\/(?<path>.*)/i.exec(hostPath)?.groups as { driveLetter?: string, path?: string };
                if (match && match.driveLetter && match.path) {
                    hostPath = `${match.driveLetter.toUpperCase()}:\\${match.path.replace('/', '\\')}`;
                }
            }

            // Now let's try to turn it into a clickable URI
            try {
                const uri = vscode.Uri.file(hostPath);

                if (uri && getVSCodeRemoteInfo().extensionKind === DockerExtensionKind.local) {
                    const clickableUri = `command:revealFileInOS?${encodeURIComponent(JSON.stringify(uri.toJSON()))}`;
                    return `[${hostPath}](${clickableUri})`;
                }
            } catch {
                // Best effort
            }

            // If we can't work out a clickable URI just return the path as-is
            return hostPath;
        });

        handlebars.registerHelper('nonEmptyObj', (obj: unknown | undefined) => {
            return obj && Object.keys(obj).length !== 0;
        });
    }

    return handlebars;
}
