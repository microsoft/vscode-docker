/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { WorkspaceFolder } from 'vscode';
import { NodeScaffoldingOptions } from '../../debugging/DockerDebugScaffoldingProvider';
import { Lazy } from '../../utils/lazy';
import { InspectMode, NodePackage, inferCommand, inferPackageName, readPackage } from '../../utils/nodeUtils';
import { resolveVariables, unresolveWorkspaceFolder } from '../../utils/resolveVariables';
import { DockerBuildOptions, DockerBuildTaskDefinitionBase } from '../DockerBuildTaskDefinitionBase';
import { DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerRunOptions, DockerRunTaskDefinitionBase } from '../DockerRunTaskDefinitionBase';
import { DockerRunTaskDefinition } from '../DockerRunTaskProvider';
import { DockerBuildTaskContext, DockerRunTaskContext, DockerTaskScaffoldContext, TaskHelper, getDefaultContainerName, getDefaultImageName, inferImageName } from '../TaskHelper';

export interface NodeTaskBuildOptions {
    package?: string;
}

export interface NodeBuildTaskDefinition extends DockerBuildTaskDefinitionBase {
    node?: NodeTaskBuildOptions;
}

export interface NodeTaskRunOptions {
    enableDebugging?: boolean;
    inspectMode?: InspectMode;
    inspectPort?: number;
    package?: string;
}

export interface NodeRunTaskDefinition extends DockerRunTaskDefinitionBase {
    node?: NodeTaskRunOptions;
}

export class NodeTaskHelper implements TaskHelper {
    public async provideDockerBuildTasks(context: DockerTaskScaffoldContext, options?: NodeScaffoldingOptions): Promise<DockerBuildTaskDefinition[]> {
        return [
            {
                type: 'docker-build',
                label: 'docker-build',
                platform: 'node',
                dockerBuild: {
                    dockerfile: unresolveWorkspaceFolder(context.dockerfile, context.folder),
                    context: unresolveWorkspaceFolder(path.dirname(context.dockerfile), context.folder),
                    pull: true
                },
                // If the package is at the root, we'll leave it out of the config for brevity, otherwise it must be specified explicitly
                node: NodeTaskHelper.getNodeOptionsForScaffolding(options?.package, context.folder),
            }
        ];
    }

    public async provideDockerRunTasks(context: DockerTaskScaffoldContext, options?: NodeScaffoldingOptions): Promise<DockerRunTaskDefinition[]> {
        return [
            {
                type: 'docker-run',
                label: 'docker-run: release',
                dependsOn: ['docker-build'],
                platform: 'node',
                node: NodeTaskHelper.getNodeOptionsForScaffolding(options?.package, context.folder),
            },
            {
                type: 'docker-run',
                label: 'docker-run: debug',
                dependsOn: ['docker-build'],
                dockerRun: {
                    env: {
                        "DEBUG": "*",
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        "NODE_ENV": "development"
                    }
                },
                node: {
                    // If the package is at the root, we'll leave it out of the config for brevity, otherwise it must be specified explicitly
                    ...NodeTaskHelper.getNodeOptionsForScaffolding(options?.package, context.folder),
                    enableDebugging: true
                },
            }
        ];
    }

    public async getDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: NodeBuildTaskDefinition): Promise<DockerBuildOptions> {
        const helperOptions = buildDefinition.node || {};
        const buildOptions = buildDefinition.dockerBuild;

        const packagePath = NodeTaskHelper.inferPackagePath(helperOptions.package, context.folder);
        const nodePackage = await readPackage(packagePath);
        const packageName = await inferPackageName(nodePackage, packagePath);

        if (buildOptions.context === undefined) {
            buildOptions.context = NodeTaskHelper.inferBuildContextPath(packagePath);
        }

        if (buildOptions.dockerfile === undefined) {
            buildOptions.dockerfile = NodeTaskHelper.inferDockerfilePath(packagePath);
        }

        if (buildOptions.tag === undefined) {
            buildOptions.tag = getDefaultImageName(packageName);
        }

        return buildOptions;
    }

    public async getDockerRunOptions(context: DockerRunTaskContext, runDefinition: NodeRunTaskDefinition): Promise<DockerRunOptions> {
        const helperOptions = runDefinition.node || {};
        const runOptions = runDefinition.dockerRun;

        const packagePath = NodeTaskHelper.inferPackagePath(helperOptions && helperOptions.package, context.folder);

        const nodePackage = new Lazy<Promise<NodePackage>>(
            async () => {
                return await readPackage(packagePath);
            });

        const packageName = await inferPackageName(await nodePackage.value, packagePath);

        if (runOptions.containerName === undefined) {
            runOptions.containerName = getDefaultContainerName(packageName);
        }

        if (runOptions.image === undefined) {
            runOptions.image = inferImageName(runDefinition as DockerRunTaskDefinition, context, packageName);
        }

        if (helperOptions && helperOptions.enableDebugging) {
            const inspectMode = helperOptions.inspectMode || 'default';
            const inspectPort = helperOptions.inspectPort !== undefined ? helperOptions.inspectPort : 9229;

            if (runOptions.command === undefined) {
                runOptions.command = await inferCommand(await nodePackage.value, inspectMode, inspectPort);
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

        return runOptions;
    }

    public static inferPackagePath(packageFile: string | undefined, folder: WorkspaceFolder): string {
        if (packageFile !== undefined) {
            return resolveVariables(packageFile, folder);
        } else {
            return path.join(folder.uri.fsPath, 'package.json');
        }
    }

    public static getNodeOptionsForScaffolding(packagePath: string | undefined, folder: WorkspaceFolder): { package?: string } | undefined {
        // If the package is at the root, we'll leave it out of the config for brevity, otherwise it must be specified explicitly
        if (packagePath && path.dirname(packagePath).toLowerCase() !== folder.uri.fsPath.toLowerCase()) {
            return {
                package: unresolveWorkspaceFolder(packagePath, folder),
            };
        }

        return undefined;
    }

    private static inferBuildContextPath(packagePath: string): string {
        return path.dirname(packagePath);
    }

    private static inferDockerfilePath(packagePath: string): string {
        return path.join(path.dirname(packagePath), 'Dockerfile');
    }
}

export const nodeTaskHelper = new NodeTaskHelper();
