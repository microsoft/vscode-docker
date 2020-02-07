/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fse from 'fs-extra';
import * as vscode from "vscode";
import { PythonExtensionHelper } from "../../tasks/python/PythonExtensionHelper";
import ChildProcessProvider from "../coreclr/ChildProcessProvider";
import CliDockerClient from "../coreclr/CliDockerClient";
import LocalOSProvider from "../coreclr/LocalOSProvider";
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, inferContainerName, ResolvedDebugConfiguration, resolveDockerServerReadyAction } from '../DebugHelper';
import { DockerDebugConfigurationBase } from "../DockerDebugConfigurationBase";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";

export type PythonProjectType = "django" | "flask" | "general";
export interface PythonScaffoldingOptions {
  projectType?: PythonProjectType;
  target?: PythonFileTarget | PythonModuleTarget
};

export interface PythonPathMapping {
  localRoot: string;
  remoteRoot: string;
}

export interface PythonDebugOptions {
  host?: string;
  port?: number;
  pathMappings?: PythonPathMapping[];
  justMyCode?: boolean;
  projectType?: PythonProjectType;
  django?: boolean;
  jinja?: boolean;
}

export interface PythonDockerDebugConfiguration
  extends DockerDebugConfigurationBase {
  python?: PythonDebugOptions;
}

export interface PythonFileTarget {
  file: string;
}

export interface PythonModuleTarget {
  module: string;
}

export class PythonDebugHelper implements DebugHelper {
  constructor(
    private readonly cliDockerClient: CliDockerClient,
    private readonly localOsProvider: LocalOSProvider) {
  }

  public async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: PythonScaffoldingOptions): Promise<DockerDebugConfiguration[]> {
    // tslint:disable: no-invalid-template-strings

    let configs = [];
    configs.push(
      {
        name: "Docker Python Launch",
        type: "docker",
        request: "launch",
        preLaunchTask: "docker-run: debug",
        python: {
          pathMappings: [
            {
              localRoot: "${workspaceFolder}",
              remoteRoot: "/app"
            }
          ],
          projectType: options.projectType
        }
      });

    // If we generated compose files, then we should generate a Python attach configuration.
    if (context.generateComposeTask){
      configs.push(
      {
        name: "Python: Remote Attach",
        type: "python",
        request: "attach",
        host: "localhost",
        port: 5678,
        pathMappings: [
          {
            localRoot: "${workspaceFolder}",
            remoteRoot: "/app"
          }
        ]
      });
    }

    return configs;
  }

  public async resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: PythonDockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
    const containerName = inferContainerName(
      debugConfiguration,
      context,
      context.folder.name
    );

    // Since Python is a special case, we need to ensure the container is removed before attempting to resolve
    // the debug configuration.
    try {
        await this.cliDockerClient.removeContainer(
          containerName,
          { force: true }
        );
      } catch {}

    const debuggerSemaphoreFilePath = PythonExtensionHelper.getSemaphoreFilePath(context.folder.name);
    await fse.remove(debuggerSemaphoreFilePath);

    let debuggerReadyPromise = new Promise((resolve) => resolve());
    if (debugConfiguration.preLaunchTask) {
      let task = await this.tryGetPrelaunchTask(debugConfiguration.preLaunchTask);

      if (!task) {
        throw new Error(`Unable to find the prelaunch task with the name: ${debugConfiguration.preLaunchTask}`);
      }

      debugConfiguration.preLaunchTask = undefined;

      vscode.tasks.executeTask(task);
      debuggerReadyPromise = PythonExtensionHelper.ensureDebuggerReady(task, debuggerSemaphoreFilePath, containerName, this.cliDockerClient);
    }

    return await debuggerReadyPromise.then(() => {
      return this.resolveDebugConfigurationInternal(debugConfiguration, containerName, context);
    });
  }

  private resolveDebugConfigurationInternal(debugConfiguration: PythonDockerDebugConfiguration, containerName: string, context: DockerDebugContext): ResolvedDebugConfiguration {
    let projectType = debugConfiguration.python.projectType;

    const dockerServerReadyAction =
      resolveDockerServerReadyAction(debugConfiguration,
                                     {
                                        containerName: containerName,
                                        pattern: this.getServerReadyPattern(projectType),
                                        uriFormat: "%s://localhost:%s"
                                      },
                                     true);

    let debugOptions = ["FixFilePathCase", "RedirectOutput", "ShowReturnValue"];

    if (this.localOsProvider.os === "Windows"){
      debugOptions.push("WindowsClient");
    }

    return {
      ...debugConfiguration,
      type: "python",
      request: "attach",
      workspaceFolder: context.folder.uri.fsPath,
      host: debugConfiguration.python.host || "localhost",
      port: debugConfiguration.python.port || 5678,
      pathMappings: debugConfiguration.python.pathMappings,
      justMyCode: debugConfiguration.python.justMyCode || true,
      django: debugConfiguration.python.django || projectType === "django",
      jinja: debugConfiguration.python.jinja || projectType === "flask",
      serverReadyAction: debugConfiguration.serverReadyAction,
      dockerOptions: {
        containerNameToKill: containerName,
        dockerServerReadyAction: dockerServerReadyAction,
        removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
      },
      debugOptions: debugOptions
    };
  }

  private async tryGetPrelaunchTask(prelaunchTaskName: string) : Promise<vscode.Task> | undefined {
    if (!prelaunchTaskName) {
      return undefined;
    }

    let tasks = await vscode.tasks.fetchTasks();

    if (tasks) {
      let results = tasks.filter(t => t.name.localeCompare(prelaunchTaskName) == 0);

      if (results && results.length > 0) {
        return results[0];
      }
    }

    return undefined;
  }

  private getServerReadyPattern(projectType: PythonProjectType) : string | undefined {
    switch (projectType) {
      case "django":
        return "Starting development server at (https?://\\S+|[0-9]+)";
      case "flask":
        return "Running on (https?://\\S+|[0-9]+)";
      default:
        return undefined
    }
  }
}

const dockerClient = new CliDockerClient(new ChildProcessProvider());
const osProvider = new LocalOSProvider();

export const pythonDebugHelper = new PythonDebugHelper(dockerClient, osProvider);
