/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { l10n } from 'vscode';

export interface NodePackage {
    main?: string;
    name?: string;
    scripts?: { [key: string]: string };
    version?: string;
}

export type InspectMode = 'default' | 'break';

export async function readPackage(packagePath: string): Promise<NodePackage> {
    return <NodePackage>await fse.readJson(packagePath);
}

export async function inferPackageName(nodePackage: NodePackage | undefined, packagePath: string): Promise<string> {
    return nodePackage && nodePackage.name
        ? nodePackage.name
        : path.basename(path.dirname(packagePath));
}

const StartScriptName: string = 'start';

export async function inferCommand(nodePackage: NodePackage | undefined, inspectMode: InspectMode, inspectPort: number): Promise<string[]> {
    const inspectArg = inspectMode === 'break' ? '--inspect-brk' : '--inspect';
    const inspectArgWithPort = `${inspectArg}=0.0.0.0:${inspectPort}`;

    if (nodePackage) {
        if (nodePackage.scripts) {
            const startScript = nodePackage.scripts[StartScriptName];

            if (startScript) {
                const result = /\b(node|nodejs) /gi.exec(startScript);

                if (result) {
                    const capturedString = result[1];

                    return ['node', inspectArgWithPort, startScript.slice(result.index + capturedString.length).trim()];
                }
            }
        }

        if (nodePackage.main) {
            return ['node', inspectArgWithPort, nodePackage.main];
        }
    }

    throw new Error(l10n.t('Unable to infer the command to run the application within the container. Set the \'dockerRun.command\' property and include the Node.js \'{0}\' argument.', inspectArgWithPort));
}
