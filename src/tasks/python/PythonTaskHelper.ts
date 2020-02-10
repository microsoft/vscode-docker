/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { PythonScaffoldingOptions } from '../../debugging/DockerDebugScaffoldingProvider';
import { inferPythonArgs, PythonDefaultDebugPort, PythonFileTarget, PythonModuleTarget } from '../../utils/pythonUtils';
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerBuildOptions } from "../DockerBuildTaskDefinitionBase";
import { DockerBuildTaskDefinition } from "../DockerBuildTaskProvider";
import { DockerContainerPort, DockerContainerVolume, DockerRunOptions, DockerRunTaskDefinitionBase } from "../DockerRunTaskDefinitionBase";
import { DockerRunTaskDefinition } from "../DockerRunTaskProvider";
import { DockerBuildTaskContext, DockerRunTaskContext, DockerTaskScaffoldContext, getDefaultContainerName, getDefaultImageName, inferImageName, TaskHelper } from "../TaskHelper";
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
    private static readonly defaultLabels: { [key: string]: string } = {
        "com.microsoft.created-by": "visual-studio-code"
    };

    public async getDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: DockerBuildTaskDefinition): Promise<DockerBuildOptions> {
        const buildOptions = buildDefinition.dockerBuild;

        /* eslint-disable no-template-curly-in-string */
        buildOptions.context = buildOptions.context || "${workspaceFolder}";
        buildOptions.dockerfile = buildOptions.dockerfile || "${workspaceFolder}/Dockerfile";
        buildOptions.tag = buildOptions.tag || getDefaultImageName(context.folder.name);
        buildOptions.labels = buildOptions.labels || PythonTaskHelper.defaultLabels;

        return buildOptions;
    }

    public async getDockerRunOptions(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<DockerRunOptions> {
        // tslint:disable no-unsafe-any
        const helperOptions : PythonTaskRunOptions = runDefinition.python || {};
        const runOptions : DockerRunOptions = runDefinition.dockerRun;

        const target: PythonFileTarget | PythonModuleTarget = helperOptions.file
            ? { file: helperOptions.file, }
            : { module: helperOptions.module };

        const launcherCommand : string = PythonExtensionHelper.getRemotePtvsdCommand(
            target,
            helperOptions.args,
            {
                host: "0.0.0.0",
                port: helperOptions.debugPort || PythonDefaultDebugPort,
                wait: helperOptions.wait === undefined ? true : helperOptions.wait
            }
        );

        const launcherFolder: string = PythonExtensionHelper.getLauncherFolderPath();

        runOptions.image = inferImageName(
            runDefinition,
            context,
            context.folder.name
        );

        runOptions.containerName = runOptions.containerName || getDefaultContainerName(context.folder.name);

        const dbgLogsFolder = path.join(os.tmpdir(), context.folder.name);

        // The debugger will complain if the logs directory does not exist.
        if (!fse.existsSync(dbgLogsFolder)) {
            fse.emptyDirSync(dbgLogsFolder);
        }

        // User input is honored in all of the below.
        runOptions.volumes = this.inferVolumes(runOptions, launcherFolder, dbgLogsFolder);
        runOptions.ports = this.inferPorts(runOptions, helperOptions);
        runOptions.entrypoint = runOptions.entrypoint || "python";
        runOptions.command = runOptions.command || launcherCommand;

        runOptions.env = this.addDebuggerEnvironmentVars(runOptions.env);
        runOptions.portsPublishAll = runOptions.portsPublishAll || true;

        return runOptions;
    }

    public async provideDockerBuildTasks(context: DockerTaskScaffoldContext): Promise<DockerBuildTaskDefinition[]> {
        return [
            {
                type: "docker-build",
                label: "docker-build",
                platform: "python",
                dockerBuild: {
                    tag: getDefaultImageName(context.folder.name),
                    dockerfile: unresolveWorkspaceFolder(context.dockerfile, context.folder),
                    /* eslint-disable no-template-curly-in-string */
                    context: "${workspaceFolder}"
                }
            }
        ];
    }

    public async provideDockerRunTasks(context: DockerTaskScaffoldContext, options: PythonScaffoldingOptions): Promise<DockerRunTaskDefinition[]> {
        const runOptions: PythonTaskRunOptions = {
            args: inferPythonArgs(options.projectType, context.ports)
        };

        if ((options.target as PythonFileTarget).file) {
            runOptions.file = (options.target as PythonFileTarget).file;
        } else {
            runOptions.module = (options.target as PythonModuleTarget).module;
        }

        return [{
            type: "docker-run",
            label: "docker-run: debug",
            dependsOn: ["docker-build"],
            python: runOptions
        }];
    }

    private inferVolumes(runOptions: DockerRunOptions, launcherFolder: string, dbgLogsFolder: string): DockerContainerVolume[] {
        const volumes: DockerContainerVolume[] = [];

        if (runOptions.volumes) {
            for (const volume of runOptions.volumes) {
                volumes.push(volume);
            }
        }

        const dbgVolumes: DockerContainerVolume[] = [
            {
                localPath: launcherFolder,
                containerPath: "/pydbg",
                permissions: "ro"
            },
            {
                localPath: dbgLogsFolder,
                containerPath: "/dbglogs",
                permissions: "rw"
            }];

        dbgVolumes.map(dbgVol => {
            if (volumes.find(volume => volume.containerPath === dbgVol.containerPath) === undefined) {
                volumes.push(dbgVol);
            }
        });

        return volumes;
    }

    private inferPorts(runOptions: DockerRunOptions, pythonOptions: PythonTaskRunOptions): DockerContainerPort[] {
        const ports: DockerContainerPort[] = [];
        const debugPort = pythonOptions.debugPort || PythonDefaultDebugPort;

        if (runOptions.ports) {
            for (const port of runOptions.ports) {
                ports.push(port);
            }
        }

        if (ports.find(port => port.containerPort === debugPort) === undefined) {
            ports.push({
                containerPort: debugPort,
                hostPort: debugPort
            });
        }

        return ports;
    }

    private addDebuggerEnvironmentVars(env: { [key: string]: string }): { [key: string]: string } {
        env = env || {};
        const debuggerVars = PythonExtensionHelper.getDebuggerEnvironmentVars();

        Object.keys(debuggerVars).map(varName => {
            env[varName] = debuggerVars[varName];
        });

        return env;
    }
}

export const pythonTaskHelper = new PythonTaskHelper();
