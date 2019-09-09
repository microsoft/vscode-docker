/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { ShellQuotedString, WorkspaceFolder } from 'vscode';
import { resolveFilePath } from '../../utils/resolveFilePath';
import { DockerBuildOptions, DockerBuildTaskDefinitionBase } from '../DockerBuildTaskDefinitionBase';
import { DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerRunOptions, DockerRunTaskDefinitionBase } from '../DockerRunTaskDefinitionBase';
import { DockerRunTaskDefinition } from '../DockerRunTaskProvider';
import { DockerBuildTaskContext, DockerRunTaskContext, DockerTaskScaffoldContext, getDefaultContainerName, getDefaultImageName, inferImageName, TaskHelper } from '../TaskHelper';

interface NodePackage {
    main?: string;
    name?: string;
    scripts?: { [key: string]: string };
}

export interface NodeTaskBuildOptions {
    package?: string;
}

export interface NodeBuildTaskDefinition extends DockerBuildTaskDefinitionBase {
    node?: NodeTaskBuildOptions;
}

export type InspectMode = 'default' | 'break';

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
    private static readonly StartScriptName: string = 'start';

    public async provideDockerBuildTasks(context: DockerTaskScaffoldContext): Promise<DockerBuildTaskDefinition[]> {
        return [
            {
                type: 'docker-build',
                label: 'docker-build',
                platform: 'node',
            }
        ];
    }

    public async provideDockerRunTasks(context: DockerTaskScaffoldContext): Promise<DockerRunTaskDefinition[]> {
        return [
            {
                type: 'docker-run',
                label: 'docker-run: release',
                dependsOn: ['docker-build'],
                platform: 'node'
            },
            {
                type: 'docker-run',
                label: 'docker-run: debug',
                dependsOn: ['docker-build'],
                node: {
                    enableDebugging: true
                }
            }
        ];
    }

    public async resolveDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: NodeBuildTaskDefinition): Promise<DockerBuildOptions> {
        const helperOptions = buildDefinition.node || {};
        const buildOptions = buildDefinition.dockerBuild;

        const packagePath = NodeTaskHelper.inferPackagePath(helperOptions.package, context.folder);
        const packageName = await NodeTaskHelper.inferPackageName(packagePath);

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

    public async resolveDockerRunOptions(context: DockerRunTaskContext, runDefinition: NodeRunTaskDefinition): Promise<DockerRunOptions> {
        const helperOptions = runDefinition.node || {};
        const runOptions = runDefinition.dockerRun;

        const packagePath = NodeTaskHelper.inferPackagePath(helperOptions && helperOptions.package, context.folder);
        const packageName = await NodeTaskHelper.inferPackageName(packagePath);

        if (runOptions.containerName === undefined) {
            runOptions.containerName = getDefaultContainerName(packageName);
        }

        if (runOptions.image === undefined) {
            runOptions.image = inferImageName(runDefinition, context, packageName);
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

        return runOptions;
    }

    public static inferPackagePath(packageFile: string | undefined, folder: WorkspaceFolder): string {
        if (packageFile !== undefined) {
            return resolveFilePath(packageFile, folder);
        } else {
            return path.join(folder.uri.fsPath, 'package.json');
        }
    }

    public static async inferPackageName(packagePath: string): Promise<string> {
        const packageJson = await fse.readFile(packagePath, 'utf8');
        const packageContent = <NodePackage>JSON.parse(packageJson);

        if (packageContent.name !== undefined) {
            return packageContent.name;
        } else {
            return path.basename(path.dirname(packagePath));
        }
    }

    private static inferBuildContextPath(packagePath: string): string {
        return path.dirname(packagePath);
    }

    private static inferDockerfilePath(packagePath: string): string {
        return path.join(path.dirname(packagePath), 'Dockerfile');
    }

    private static async inferCommand(packagePath: string, inspectMode: InspectMode, inspectPort: number): Promise<string | ShellQuotedString[]> {
        const inspectArg = inspectMode === 'break' ? '--inspect-brk' : '--inspect';
        const inspectArgWithPort = `${inspectArg}=0.0.0.0:${inspectPort}`;

        const packageJson = await fse.readFile(packagePath, 'utf8');
        const packageContent = <NodePackage>JSON.parse(packageJson);

        if (packageContent.scripts) {
            const startScript = packageContent.scripts[NodeTaskHelper.StartScriptName];

            if (startScript && startScript.startsWith('node ')) {
                const updatedStartScript = `node ${inspectArgWithPort} ${startScript.substring(5)}`;

                return updatedStartScript;
            }
        }

        if (packageContent.main) {
            return `node ${inspectArgWithPort} ${packageContent.main}`;
        }

        throw new Error(`Unable to infer the command to run the application within the container. Set the 'dockerRun.command' property and include the Node.js '${inspectArgWithPort}' argument.`);
    }
}

const nodeTaskHelper = new NodeTaskHelper();

export default nodeTaskHelper;
