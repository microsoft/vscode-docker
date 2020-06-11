/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PythonScaffoldingOptions } from '../../debugging/DockerDebugScaffoldingProvider';
import { inferPythonArgs } from '../../utils/pythonUtils';
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerBuildOptions } from "../DockerBuildTaskDefinitionBase";
import { DockerBuildTaskDefinition } from "../DockerBuildTaskProvider";
import { DockerContainerVolume, DockerRunOptions, DockerRunTaskDefinitionBase } from "../DockerRunTaskDefinitionBase";
import { DockerRunTaskDefinition } from "../DockerRunTaskProvider";
import { addVolumeWithoutConflicts, DockerBuildTaskContext, DockerRunTaskContext, DockerTaskScaffoldContext, getDefaultContainerName, getDefaultImageName, inferImageName, TaskHelper } from "../TaskHelper";
import { PythonExtensionHelper } from "./PythonExtensionHelper";

export interface PythonTaskRunOptions {
    file?: string;
    module?: string;
    args?: string[];
    wait?: boolean;
    debugPort?: number
}

export interface PythonRunTaskDefinition extends DockerRunTaskDefinitionBase {
    python?: PythonTaskRunOptions;
}

export class PythonTaskHelper implements TaskHelper {
    public async provideDockerBuildTasks(context: DockerTaskScaffoldContext): Promise<DockerBuildTaskDefinition[]> {
        return [
            {
                type: 'docker-build',
                label: 'docker-build',
                platform: 'python',
                dockerBuild: {
                    tag: getDefaultImageName(context.folder.name),
                    dockerfile: unresolveWorkspaceFolder(context.dockerfile, context.folder),
                    /* eslint-disable no-template-curly-in-string */
                    context: '${workspaceFolder}',
                    pull: true
                },
            }
        ];
    }

    public async provideDockerRunTasks(context: DockerTaskScaffoldContext, options: PythonScaffoldingOptions): Promise<DockerRunTaskDefinition[]> {
        const runOptions: PythonTaskRunOptions = {
            args: inferPythonArgs(options.projectType, context.ports)
        };

        let dockerRunOptions: DockerRunOptions | undefined;

        if ('file' in options.target) {
            runOptions.file = options.target.file;
        } else {
            runOptions.module = options.target.module;
        }

        // If the projectType is flask, then we set the module to 'flask' and
        // set whatever the user entered in an env variable named "FLASK_APP".
        if (options.projectType === 'flask') {
            dockerRunOptions = {
                env: {
                    "FLASK_APP": runOptions.file || runOptions.module
                }
            }
            runOptions.module = 'flask';
            runOptions.file = undefined;
        }

        return [{
            type: 'docker-run',
            label: 'docker-run: debug',
            dependsOn: ['docker-build'],
            dockerRun: dockerRunOptions,
            python: runOptions,
        }];
    }

    public async getDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: DockerBuildTaskDefinition): Promise<DockerBuildOptions> {
        const buildOptions = buildDefinition.dockerBuild;

        /* eslint-disable no-template-curly-in-string */
        buildOptions.context = buildOptions.context || '${workspaceFolder}';
        buildOptions.dockerfile = buildOptions.dockerfile || '${workspaceFolder}/Dockerfile';
        buildOptions.tag = buildOptions.tag || getDefaultImageName(context.folder.name);

        return buildOptions;
    }

    public async getDockerRunOptions(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<DockerRunOptions> {
        // tslint:disable no-unsafe-any
        const runOptions: DockerRunOptions = runDefinition.dockerRun;
        const launcherFolder: string = await PythonExtensionHelper.getLauncherFolderPath();

        runOptions.image = inferImageName(
            runDefinition,
            context,
            context.folder.name
        );

        runOptions.containerName = runOptions.containerName || getDefaultContainerName(context.folder.name);

        // User input is honored in all of the below.
        runOptions.volumes = this.inferVolumes(runOptions, launcherFolder);
        runOptions.entrypoint = runOptions.entrypoint || 'python';
        runOptions.portsPublishAll = runOptions.portsPublishAll || true;

        return runOptions;
    }

    private inferVolumes(runOptions: DockerRunOptions, launcherFolder: string): DockerContainerVolume[] {
        if (!launcherFolder) {
            return;
        }

        const volumes = runOptions?.volumes ? [...runOptions.volumes] : [];
        const dbgVolume: DockerContainerVolume = {
            localPath: launcherFolder,
            containerPath: '/pydbg',
            permissions: 'ro'
        };

        addVolumeWithoutConflicts(volumes, dbgVolume);

        return volumes;
    }
}

export const pythonTaskHelper = new PythonTaskHelper();
