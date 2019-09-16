/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { unresolveFilePath } from '../../utils/resolveFilePath';
import { DockerBuildOptions, DockerBuildTaskDefinitionBase } from '../DockerBuildTaskDefinitionBase';
import { DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerContainerPort, DockerContainerVolume, DockerRunOptions, DockerRunTaskDefinitionBase } from '../DockerRunTaskDefinitionBase';
import { DockerRunTaskDefinition } from '../DockerRunTaskProvider';
import { addPortWithoutConflicts, addVolumeWithoutConflicts, DockerBuildTaskContext, DockerRunTaskContext, DockerTaskScaffoldContext, getDefaultContainerName, getDefaultImageName, inferImageName, TaskHelper } from '../TaskHelper';
import { pyExtension } from './pyExtension';

// tslint:disable-next-line: no-empty-interface
export interface PythonTaskBuildOptions {
}

export interface PythonBuildTaskDefinition extends DockerBuildTaskDefinitionBase {
    python?: PythonTaskBuildOptions;
}

export interface PythonTaskRunOptions {
    file?: string;
    module?: string;
    args?: string[];
    wait?: boolean;
}

export interface PythonRunTaskDefinition extends DockerRunTaskDefinitionBase {
    python?: PythonTaskRunOptions;
}

export class PythonTaskHelper implements TaskHelper {
    private static readonly defaultLabels: { [key: string]: string } = { 'com.microsoft.created-by': 'visual-studio-code' };

    public async provideDockerBuildTasks(context: DockerTaskScaffoldContext): Promise<DockerBuildTaskDefinition[]> {
        return [
            {
                type: 'docker-build',
                label: 'docker-build',
                platform: 'python',
                dockerBuild: {
                    tag: getDefaultImageName(context.folder.name),
                    dockerfile: unresolveFilePath(context.dockerfile, context.folder),
                    // tslint:disable-next-line: no-invalid-template-strings
                    context: '${workspace}',
                },
            }
        ];
    }

    public async provideDockerRunTasks(context: DockerTaskScaffoldContext): Promise<DockerRunTaskDefinition[]> {
        return [
            {
                type: 'docker-run',
                label: 'docker-run: debug',
                dependsOn: ['docker-build'],
                platform: 'python',
                python: {
                    // tslint:disable-next-line: no-invalid-template-strings
                    file: '${relativeFile}',
                    wait: true,
                },
                dockerRun: {},
            }
        ];
    }

    public async resolveDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: PythonBuildTaskDefinition): Promise<DockerBuildOptions> {
        //const helperOptions = buildDefinition.python || {};
        const buildOptions = buildDefinition.dockerBuild;

        // tslint:disable: no-invalid-template-strings
        buildOptions.context = buildOptions.context || '${workspaceFolder}';
        buildOptions.dockerfile = buildOptions.dockerfile || '${workspaceFolder}/Dockerfile';
        // tslint:enable: no-invalid-template-strings
        buildOptions.tag = buildOptions.tag || getDefaultImageName(context.folder.name);
        buildOptions.labels = buildOptions.labels || PythonTaskHelper.defaultLabels;

        return buildOptions;
    }

    public async resolveDockerRunOptions(context: DockerRunTaskContext, runDefinition: PythonRunTaskDefinition): Promise<DockerRunOptions> {
        const helperOptions = runDefinition.python || {};
        const runOptions = runDefinition.dockerRun;

        // TODO: file
        /*if (helperOptions.file) {
            helperOptions.file = path.relative(context.folder.uri.fsPath, resolveFilePath(helperOptions.file, context.folder));
        }*/

        const target: pyExtension.FileTarget | pyExtension.ModuleTarget = helperOptions.file ? { file: helperOptions.file } : { module: helperOptions.module };

        const launcherCommand = await pyExtension.getRemoteLauncherCommand(target, helperOptions.args, { host: '0.0.0.0', port: 5678, wait: helperOptions.wait === undefined ? true : helperOptions.wait });
        const launcherFolder = await pyExtension.getLauncherFolderPath();

        runOptions.image = inferImageName(runDefinition, context, context.folder.name);
        runOptions.containerName = runOptions.containerName || getDefaultContainerName(context.folder.name);
        runOptions.volumes = await this.inferVolumes(runOptions, launcherFolder); // This method internally checks the user-defined input first
        runOptions.ports = await this.inferPorts(runOptions); // This method internally checks the user-defined input first

        runOptions.entrypoint = await this.inferEntrypoint(launcherCommand); // User-defined input is not considered
        runOptions.command = await this.inferCommand(launcherCommand, launcherFolder); // User-defined input is not considered

        return runOptions;
    }

    private async inferVolumes(runOptions: DockerRunOptions, launcherFolder: string): Promise<DockerContainerVolume[]> {
        const volumes: DockerContainerVolume[] = [];

        if (runOptions.volumes) {
            for (const volume of runOptions.volumes) {
                addVolumeWithoutConflicts(volumes, volume);
            }
        }

        const dbgVolume: DockerContainerVolume = {
            localPath: launcherFolder,
            containerPath: '/pydbg',
            permissions: 'ro',
        };

        addVolumeWithoutConflicts(volumes, dbgVolume);

        return volumes;
    }

    private async inferPorts(runOptions: DockerRunOptions): Promise<DockerContainerPort[]> {
        const ports: DockerContainerPort[] = [];

        if (runOptions.ports) {
            for (const port of runOptions.ports) {
                addPortWithoutConflicts(ports, port);
            }
        }

        const dbgPort: DockerContainerPort = {
            containerPort: 5678,
            hostPort: 5678
        };

        addPortWithoutConflicts(ports, dbgPort);

        return ports;
    }

    private async inferEntrypoint(launcherCommand: string): Promise<string> {
        const parts = launcherCommand.split(/\s/i);
        return parts[0];
    }

    private async inferCommand(launcherCommand: string, launcherFolder: string): Promise<string> {
        let parts = launcherCommand.split(/\s/i);
        parts = parts.map((part: string) => {
            if (part.includes(launcherFolder)) {
                return part.replace(launcherFolder, '/pydbg').replace(/\\/g, '/');
            }

            return part;
        });

        return parts.slice(1).join(' ');
    }
}

const pythonTaskHelper = new PythonTaskHelper();

export default pythonTaskHelper;
