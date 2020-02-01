/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PythonProjectType, PythonScaffoldingOptions } from "../../debugging/python/PythonDebugHelper";
import { DockerBuildOptions, DockerBuildTaskDefinitionBase } from "../DockerBuildTaskDefinitionBase";
import { DockerBuildTaskDefinition } from "../DockerBuildTaskProvider";
import { DockerContainerPort, DockerContainerVolume, DockerRunOptions, DockerRunTaskDefinitionBase } from "../DockerRunTaskDefinitionBase";
import { DockerRunTaskDefinition } from "../DockerRunTaskProvider";
import { DockerBuildTaskContext, DockerRunTaskContext, DockerTaskScaffoldContext, getDefaultContainerName, getDefaultImageName, inferImageName, TaskHelper } from "../TaskHelper";
import { PythonExtensionHelper } from "./PythonExtensionHelper";
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";

// tslint:disable-next-line: no-empty-interface
export interface PythonTaskBuildOptions {}

export interface PythonBuildTaskDefinition
  extends DockerBuildTaskDefinitionBase {
  python?: PythonTaskBuildOptions;
}

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
  public async getDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: DockerBuildTaskDefinition): Promise<DockerBuildOptions> {
    const buildOptions = buildDefinition.dockerBuild;

    // tslint:disable: no-invalid-template-strings
    buildOptions.context = buildOptions.context || "${workspaceFolder}";
    buildOptions.dockerfile =
      buildOptions.dockerfile || "${workspaceFolder}/Dockerfile";
    // tslint:enable: no-invalid-template-strings
    buildOptions.tag =
      buildOptions.tag || getDefaultImageName(context.folder.name);
    buildOptions.labels = buildOptions.labels || PythonTaskHelper.defaultLabels;

    return buildOptions;
  }

  public async getDockerRunOptions(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<DockerRunOptions> {
    const helperOptions = runDefinition.python || {};
    const runOptions = runDefinition.dockerRun;

    const target:
      | PythonExtensionHelper.FileTarget
      | PythonExtensionHelper.ModuleTarget = helperOptions.file
      ? { file: helperOptions.file }
      : { module: helperOptions.module };

    const launcherCommand = await PythonExtensionHelper.getRemoteLauncherCommand(
      target,
      helperOptions.args,
      {
        host: "0.0.0.0",
        port: helperOptions.debugPort || 5678,
        wait: helperOptions.wait === undefined ? true : helperOptions.wait
      }
    );
    const launcherFolder = await PythonExtensionHelper.getLauncherFolderPath();

    runOptions.image = inferImageName(
      runDefinition as DockerRunTaskDefinition,
      context,
      context.folder.name
    );

    runOptions.containerName = runOptions.containerName || getDefaultContainerName(context.folder.name);

    runOptions.volumes = await this.inferVolumes(runOptions, launcherFolder); // This method internally checks the user-defined input first
    runOptions.ports = await this.inferPorts(runOptions, helperOptions); // This method internally checks the user-defined input first
    runOptions.entrypoint = runOptions.entrypoint || await this.inferEntrypoint(launcherCommand);
    runOptions.command = runOptions.command || await this.inferCommand(launcherCommand, launcherFolder);

    runOptions.env = this.addDebuggerEnvironmentVar(runOptions.env, context.folder.name);
    runOptions.portsPublishAll = runOptions.portsPublishAll || true;

    return runOptions;
  }

  private static readonly defaultLabels: { [key: string]: string } = {
    "com.microsoft.created-by": "visual-studio-code"
  };

  public async provideDockerBuildTasks(context: DockerTaskScaffoldContext, options: PythonScaffoldingOptions): Promise<DockerBuildTaskDefinition[]> {
    return [
      {
        type: "docker-build",
        label: "docker-build",
        platform: "python",
        dockerBuild: {
          tag: getDefaultImageName(context.folder.name),
          dockerfile: unresolveWorkspaceFolder(context.dockerfile, context.folder),
          // tslint:disable-next-line: no-invalid-template-strings
          context: "${workspaceFolder}"
        }
      }
    ];
  }

  public async provideDockerRunTasks(context: DockerTaskScaffoldContext, options: PythonScaffoldingOptions): Promise<DockerRunTaskDefinition[]> {
    return [
      {
        type: "docker-run",
        label: "docker-run: debug",
        dependsOn: ["docker-build"],
        platform: "python",
        python: {
          // tslint:disable-next-line: no-invalid-template-strings
          file: this.inferRunFile(options.projectType),
          args: this.inferArgs(options.projectType, context)
        }
      }
    ];
  }

  private async inferVolumes(runOptions: DockerRunOptions, launcherFolder: string): Promise<DockerContainerVolume[]> {
    const volumes: DockerContainerVolume[] = [];

    if (runOptions.volumes) {
      for (const volume of runOptions.volumes) {
        volumes.push(volume);
      }
    }

    const dbgVolume: DockerContainerVolume = {
      localPath: launcherFolder,
      containerPath: "/pydbg",
      permissions: "rw"
    };

    volumes.push(dbgVolume);

    return volumes;
  }

  private async inferPorts(runOptions: DockerRunOptions, pythonOptions: PythonTaskRunOptions): Promise<DockerContainerPort[]> {
    const ports: DockerContainerPort[] = [];
    const debugPort = pythonOptions.debugPort || 5678;

    if (runOptions.ports) {
      for (const port of runOptions.ports) {
        ports.push(port);
      }
    }

    if (ports.find(port => port.containerPort === debugPort) === undefined)
    {
        ports.push({
          containerPort: debugPort,
          hostPort: debugPort
        });
    }

    return ports;
  }

  private async inferEntrypoint(launcherCommand: string): Promise<string> {
    const parts = launcherCommand.split(/\s/i);
    const dbgEntrypoint = parts.length > 0 ? parts[0] : undefined;

    return dbgEntrypoint;
  }

  private async inferCommand(launcherCommand: string, launcherFolder: string): Promise<string> {
    let parts = launcherCommand.split(/\s/i);
    parts = parts.map((part: string) => {
      if (part.includes(launcherFolder)) {
          return part.replace(launcherFolder, "/pydbg").replace(/\\/g, "/");
      }

      return part;
    });

    return parts.slice(1).join(" ");
  }

  private inferArgs(projectType: PythonProjectType, context: DockerTaskScaffoldContext): string[] | undefined {
    switch (projectType) {
      case 'django':
        return [
          "runserver",
          `0.0.0.0:${context.ports !== undefined ? context.ports[0] : 8000}`
        ];
      default:
        return undefined;
    }
  }

  private inferRunFile(projectType: PythonProjectType): string {
    // tslint:disable: no-invalid-template-strings
    switch (projectType) {
      case 'django':
        return 'manage.py';
      default:
        return "${relativeFile}"
    }
  }

  private addDebuggerEnvironmentVar(env: { [key: string]: string }, folder: string): { [key: string]: string }{
    env = env || {};
    env["PTVSD_ADAPTER_ENDPOINTS"] = `/pydbg/ptvsd/dbg_${folder}.sem`;

    return env;
  }
}

export const pythonTaskHelper = new PythonTaskHelper();
