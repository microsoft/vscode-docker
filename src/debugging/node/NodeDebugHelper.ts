/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DebugHelper, ResolvedDebugConfiguration, ResolvedDebugConfigurationOptions } from '../DebugHelper';
import { DebugConfigurationBase, DockerDebugConfigurationBase } from '../DockerDebugConfigurationBase';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

interface NodePackage {
    name?: string;
}

export interface NodeDebugOptions {
    protocol?: string;
    port?: number;
    address?: string;
    sourceMaps?: boolean;
    outFiles?: string[];
    autoAttachChildProcesses?: boolean;
    timeout?: number;
    stopOnEntry?: boolean;
    localRoot?: string;
    remoteRoot?: string;
    smartStep?: boolean;
    skipFiles?: string[];
    trace?: boolean;
}

export interface NodeDebugConfiguration extends DebugConfigurationBase, NodeDebugOptions {
}

export interface NodeDockerDebugConfiguration extends DockerDebugConfigurationBase {
    node?: NodeDebugOptions;
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

    public async resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: NodeDockerDebugConfiguration, token?: CancellationToken): Promise<ResolvedDebugConfiguration | undefined> {
        const packagePath = NodeDebugHelper.inferPackagePath(undefined /* TODO: Support package file */, folder);
        const packageName = await NodeDebugHelper.inferPackageName(packagePath);

        const dockerOptions: ResolvedDebugConfigurationOptions = {
            containerNameToKill: NodeDebugHelper.inferContainerName(packageName),
            dockerServerReadyAction: debugConfiguration.dockerServerReadyAction,
            removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
        };

        const resolvedConfiguration: NodeDebugConfiguration = {
            ...debugConfiguration.node,
            name:  debugConfiguration.name,
            dockerOptions,
            preLaunchTask: debugConfiguration.preLaunchTask,
            request: 'attach',
            type: 'node2'
        };

        // tslint:disable-next-line: no-invalid-template-strings
        resolvedConfiguration.localRoot = '${workspaceFolder}';
        resolvedConfiguration.port = 9229;
        resolvedConfiguration.remoteRoot = '/usr/src/app';

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
