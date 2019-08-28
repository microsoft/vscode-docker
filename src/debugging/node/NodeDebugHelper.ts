/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { CancellationToken, WorkspaceFolder } from 'vscode';
import { cloneObject } from '../../utils/cloneObject';
import { DebugHelper } from '../DebugHelper';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

interface NodePackage {
    name?: string;
}

export interface NodeDebugOptions {
    foo?: string;
}

export class NodeDebugHelper implements DebugHelper {
    public async provideDebugConfigurations(folder: WorkspaceFolder): Promise<DockerDebugConfiguration[]> {
        return [
            {
                name: 'Docker Node.js Launch',
                type: 'docker-launch',
                request: 'launch',
                preLaunchTask: 'docker-run',
                platform: 'node'
            }
        ];
    }

    public async resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration> {
        const resolvedConfiguration = cloneObject(debugConfiguration);

        // tslint:disable-next-line: no-invalid-template-strings
        resolvedConfiguration.localRoot = '${workspaceFolder}';
        resolvedConfiguration.port = 9229;
        resolvedConfiguration.remoteRoot = '/usr/src/app';
        resolvedConfiguration.request = 'attach';
        resolvedConfiguration.type = 'node2';

        const packagePath = NodeDebugHelper.inferPackagePath(undefined /* TODO: Support package file */, folder);
        const packageName = await NodeDebugHelper.inferPackageName(packagePath);

        if (resolvedConfiguration._containerNameToKill === undefined) {
            resolvedConfiguration._containerNameToKill = NodeDebugHelper.inferContainerName(packageName);
        }

        return await Promise.resolve(resolvedConfiguration);
    }

    private static inferPackagePath(packageFile: string | undefined, folder: WorkspaceFolder): string {
        if (packageFile !== undefined) {
            return this.resolveFilePath(packageFile, folder);
        } else {
            return path.join(folder.uri.fsPath, 'package.json');
        }
    }

    private static async inferPackageName(packagePath: string): Promise<string> {
        const packageJson = await fse.readFile(packagePath, 'utf8');
        const packageContent = <NodePackage>JSON.parse(packageJson);

        if (packageContent.name !== undefined) {
            return packageContent.name;
        } else {
            const packageBaseDirName = await Promise.resolve(path.basename(path.dirname(packagePath)));

            return packageBaseDirName;
        }
    }

    private static inferContainerName(packageName: string): string {
        return `${packageName}-dev`;
    }

    private static resolveFilePath(filePath: string, folder: WorkspaceFolder): string {
        const replacedPath = filePath.replace(/\$\{workspaceFolder\}/gi, folder.uri.fsPath);

        return path.resolve(folder.uri.fsPath, replacedPath);
    }
}
