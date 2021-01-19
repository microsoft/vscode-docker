/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { ScaffoldingWizardContext } from '../scaffolding/wizard/ScaffoldingWizardContext';
import { isWindows } from './osUtils';
import { pathNormalize } from './pathNormalize';
import { PlatformOS } from './platform';

let handlebars: typeof import('handlebars') | undefined;
export async function getHandlebarsWithHelpers(): Promise<typeof import('handlebars')> {
    if (!handlebars) {
        handlebars = await import('handlebars');

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
            if (!isWindows()) {
                return hostPath;
            }

            // Bind mount host paths are ugly on Windows, e.g. /run/desktop/mnt/host/c/Path/To/Folder
            // Let's make it nicer
            const match = /\/run\/desktop\/mnt\/host\/(?<driveLetter>[a-z])\/(?<path>.*)/i.exec(hostPath).groups as { driveLetter?: string, path?: string };
            if (match && match.driveLetter && match.path) {
                return `${match.driveLetter.toUpperCase()}:\\${match.path.replace('/', '\\')}`;
            }
        });
    }

    return handlebars;
}
