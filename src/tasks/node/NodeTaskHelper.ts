/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { CancellationToken, ShellQuotedString, TaskDefinition, WorkspaceFolder } from 'vscode';
import { CommandLineBuilder } from '../../../extension.bundle';
import { DockerBuildHelperOptions, DockerBuildOptions, DockerBuildTaskContext, DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerRunHelperOptions, DockerRunOptions, DockerRunTaskContext, DockerRunTaskDefinition } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

interface NodePackage {
    name?: string;
}

export interface NodeTaskBuildOptions extends DockerBuildHelperOptions {
    package?: string;
}

export interface NodeBuildTaskDefinition extends TaskDefinition {
    node?: NodeTaskBuildOptions;
}

export type InspectMode = 'default' | 'break';

export interface NodeTaskRunOptions extends DockerRunHelperOptions {
    enableDebugging?: boolean;
    inspectMode?: InspectMode;
    inspectPort?: number;
    package?: string;
}

export class NodeTaskHelper implements TaskHelper {
    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTaskDefinition[]> {
        return [
            {
                type: 'docker-build',
                label: 'docker-build',
                platform: 'node',
            }
        ];
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTaskDefinition[]> {
        return [
            {
                type: 'docker-run',
                label: 'docker-run',
                dependsOn: ['docker-build'],
                node: {
                    enableDebugging: true
                }
            }
        ];
    }

    public async resolveDockerBuildOptions(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, context: DockerBuildTaskContext, token?: CancellationToken): Promise<DockerBuildOptions> {
        const helperOptions: NodeTaskBuildOptions = context.helperOptions || {};
        const packagePath = NodeTaskHelper.inferPackagePath(helperOptions.package, folder);
        const packageName = await NodeTaskHelper.inferPackageName(packagePath);

        if (buildOptions.context === undefined) {
            buildOptions.context = NodeTaskHelper.inferBuildContextPath(buildOptions && buildOptions.context, folder, packagePath);
        }

        if (buildOptions.tag === undefined) {
            buildOptions.tag = NodeTaskHelper.inferTag(packageName);
        }

        return await Promise.resolve(buildOptions);
    }

    public async resolveDockerRunOptions(folder: WorkspaceFolder, runOptions: DockerRunOptions, context: DockerRunTaskContext, token?: CancellationToken): Promise<DockerRunOptions> {
        const helperOptions: NodeTaskRunOptions = context.helperOptions || {};
        const packagePath = NodeTaskHelper.inferPackagePath(helperOptions && helperOptions.package, folder);
        const packageName = await NodeTaskHelper.inferPackageName(packagePath);

        if (runOptions.containerName === undefined) {
            runOptions.containerName = NodeTaskHelper.inferContainerName(packageName);
        }

        if (runOptions.image === undefined) {
            runOptions.image = NodeTaskHelper.inferTag(packageName);
        }

        if (helperOptions && helperOptions.enableDebugging) {
            const inspectMode = helperOptions.inspectMode || 'default';
            const inspectPort = helperOptions.inspectPort !== undefined ? helperOptions.inspectPort : 9229;

            if (runOptions.command === undefined) {
                runOptions.command = await NodeTaskHelper.inferCommand(packagePath, inspectMode, inspectPort);
            }

            if (runOptions.ports === undefined) {
                runOptions.ports = [];
            }

            let inspectPortPublished = false;

            // If not already defined, create a mapping for the inspect port between container and host...
            if (runOptions.ports.find(port => port.containerPort === inspectPort) === undefined) {
                runOptions.ports.push({
                    containerPort: inspectPort,
                    // TODO: Can this mapping be dynamic?
                    hostPort: inspectPort
                });

                inspectPortPublished = true;
            }

            // NOTE: By default, if no ports are explicitly published and the options do not say otherwise, all ports will be published.
            //       If we published the inspection port, and it was the only published port, that "publish all" behavior would unintentionally be disabled.
            //       Hence, in that situation, we force "publish all" in addition to the inspection port.
            if (runOptions.portsPublishAll === undefined && inspectPortPublished && runOptions.ports.length === 1) {
                runOptions.portsPublishAll = true;
            }
        }

        return await Promise.resolve(runOptions);
    }

    private static inferPackagePath(packageFile: string | undefined, folder: WorkspaceFolder): string {
        if (packageFile !== undefined) {
            return this.resolveFilePath(packageFile, folder);
        } else {
            return path.join(folder.uri.fsPath, 'package.json');
        }
    }

    private static inferBuildContextPath(buildContext: string | undefined, folder: WorkspaceFolder, packagePath: string): string {
        if (buildContext !== undefined) {
            return this.resolveFilePath(buildContext, folder);
        } else {
            return path.dirname(packagePath);
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

    private static inferTag(packageName: string): string {
        return `${packageName}:latest`;
    }

    private static async inferCommand(packagePath: string, inspectMode: InspectMode, inspectPort: number): Promise<ShellQuotedString[]> {
        const inspectArg = inspectMode === 'break' ? '--inspect-brk' : '--inspect';

        // TODO: Infer startup script...
        const command = CommandLineBuilder
                .create('node')
                .withNamedArg(inspectArg, `0.0.0.0:${inspectPort}`, { assignValue: true })
                .withQuotedArg(`./bin/www`)
                .buildShellQuotedStrings();

        return await Promise.resolve(command);
    }

    private static resolveFilePath(filePath: string, folder: WorkspaceFolder): string {
        const replacedPath = filePath.replace(/\$\{workspaceFolder\}/gi, folder.uri.fsPath);

        return path.resolve(folder.uri.fsPath, replacedPath);
    }
}
