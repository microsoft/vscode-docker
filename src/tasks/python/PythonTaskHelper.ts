/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { PythonScaffoldingOptions } from '../../debugging/DockerDebugScaffoldingProvider';
import { getTempDirectoryPath, inferPythonArgs, PythonDefaultDebugPort, PythonTarget } from '../../utils/pythonUtils';
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerBuildOptions } from "../DockerBuildTaskDefinitionBase";
import { DockerBuildTaskDefinition } from "../DockerBuildTaskProvider";
import { DockerContainerPort, DockerContainerVolume, DockerRunOptions, DockerRunTaskDefinitionBase } from "../DockerRunTaskDefinitionBase";
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
        const helperOptions: PythonTaskRunOptions = runDefinition.python || {};
        const runOptions: DockerRunOptions = runDefinition.dockerRun;

        const target: PythonTarget = helperOptions.file
            ? { file: helperOptions.file, }
            : { module: helperOptions.module };

        const launcherCommand: string = PythonExtensionHelper.getRemotePtvsdCommand(
            target,
            helperOptions.args,
            {
                host: '0.0.0.0',
                port: helperOptions.debugPort || PythonDefaultDebugPort,
                wait: helperOptions.wait === undefined ? true : helperOptions.wait
            }
        );

        const launcherFolder: string = await PythonExtensionHelper.getLauncherFolderPath();

        runOptions.image = inferImageName(
            runDefinition,
            context,
            context.folder.name
        );

        runOptions.containerName = runOptions.containerName || getDefaultContainerName(context.folder.name);

        const tempDir = await getTempDirectoryPath();
        const dbgLogsFolder = path.join(tempDir, context.folder.name);

        // The debugger will complain if the logs directory does not exist.
        if (!(await fse.pathExists(dbgLogsFolder))) {
            await fse.emptyDir(dbgLogsFolder);
        }

        // User input is honored in all of the below.
        runOptions.volumes = this.inferVolumes(runOptions, launcherFolder, dbgLogsFolder);
        runOptions.ports = this.inferPorts(runOptions, helperOptions);
        runOptions.entrypoint = runOptions.entrypoint || 'python';
        runOptions.command = runOptions.command || launcherCommand;

        runOptions.env = this.addDebuggerEnvironmentVars(runOptions.env);
        runOptions.portsPublishAll = runOptions.portsPublishAll || true;

        return runOptions;
    }

    private inferVolumes(runOptions: DockerRunOptions, launcherFolder: string, dbgLogsFolder: string): DockerContainerVolume[] {
        if (!launcherFolder || !dbgLogsFolder) {
            return;
        }

        const volumes = runOptions?.volumes ? [...runOptions.volumes] : [];
        const dbgVolumes: DockerContainerVolume[] = [
            {
                localPath: launcherFolder,
                containerPath: '/pydbg',
                permissions: 'ro'
            },
            {
                localPath: dbgLogsFolder,
                containerPath: '/dbglogs',
                permissions: 'rw'
            }];

        dbgVolumes.map(dbgVol => { addVolumeWithoutConflicts(volumes, dbgVol) });

        return volumes;
    }

    private inferPorts(runOptions: DockerRunOptions, pythonOptions: PythonTaskRunOptions): DockerContainerPort[] {
        const ports: DockerContainerPort[] = runOptions?.ports ? [...runOptions.ports] : [];
        const debugPort = pythonOptions.debugPort || PythonDefaultDebugPort;

        if (ports.find(port => port.containerPort === debugPort) === undefined) {
            ports.push({
                containerPort: debugPort,
                hostPort: debugPort
            });
        }

        return ports;
    }

    private addDebuggerEnvironmentVars(env: { [key: string]: string }): { [key: string]: string } {
        env = env ?? {};
        const debuggerVars = PythonExtensionHelper.getDebuggerEnvironmentVars();

        Object.keys(debuggerVars).map(varName => {
            env[varName] = debuggerVars[varName];
        });

        return env;
    }
}

export const pythonTaskHelper = new PythonTaskHelper();
