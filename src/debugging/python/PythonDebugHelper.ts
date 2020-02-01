/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fse from 'fs-extra';
import * as vscode from "vscode";
import { PythonExtensionHelper } from "../../tasks/python/PythonExtensionHelper";
import { delay } from '../../utils/delay';
import { PlatformOS } from "../../utils/platform";
import ChildProcessProvider from "../coreclr/ChildProcessProvider";
import CliDockerClient from "../coreclr/CliDockerClient";
import LocalOSProvider from "../coreclr/LocalOSProvider";
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, inferContainerName, ResolvedDebugConfiguration, resolveDockerServerReadyAction } from '../DebugHelper';
import { DockerDebugConfigurationBase } from "../DockerDebugConfigurationBase";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";

export type PythonProjectType = "django" | "flask" | "general";
export interface PythonScaffoldingOptions {
  projectType?: PythonProjectType;
  platformOS?: PlatformOS;
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

export class PythonDebugHelper implements DebugHelper {
  constructor(
    private readonly cliDockerClient: CliDockerClient,
    private readonly localOsProvider: LocalOSProvider) {
  }

  public async provideDebugConfigurations(
    context: DockerDebugScaffoldContext,
    options?: PythonScaffoldingOptions
  ): Promise<DockerDebugConfiguration[]> {
    // tslint:disable: no-invalid-template-strings
    return [
      {
        name: "Docker: Python Launch and Attach",
        type: "docker",
        request: "launch",
        preLaunchTask: "docker-run: debug",
        platform: "python",
        python: {
          pathMappings: [
            {
              localRoot: "${workspaceFolder}",
              remoteRoot: "/app"
            }
          ],
          projectType: options.projectType
        }
      }
    ];
  }

  // tslint:disable-next-line: max-func-body-length
  public async resolveDebugConfiguration(
    context: DockerDebugContext,
    debugConfiguration: PythonDockerDebugConfiguration
  ): Promise<ResolvedDebugConfiguration | undefined> {
    const containerName = inferContainerName(
      debugConfiguration,
      context,
      context.folder.name
    );

    // Since Python is a special case, we need to ensure that the container is removed before attempting to resolve
    // the debug configuration.
    try {
        await this.cliDockerClient.removeContainer(
          containerName,
          { force: true }
        );
      } catch {}

    const debuggerSemaphoreFilePath = await this.getSemaphoreFilePath(context.folder.name, this.localOsProvider.os);
    await fse.remove(debuggerSemaphoreFilePath);

    let debuggerReadyPromise = new Promise((resolve) => resolve());
    if (debugConfiguration.preLaunchTask) {
      let task = await this.tryGetPrelaunchTask(debugConfiguration.preLaunchTask);

      if (!task) {
        throw new Error(`Unable to find the prelaunch task with the name ${debugConfiguration.preLaunchTask}`);
      }

      debugConfiguration.preLaunchTask = null;

      vscode.tasks.executeTask(task);
      debuggerReadyPromise = this.ensureDebuggerReady(task, debuggerSemaphoreFilePath);
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
                                        pattern: this.getServerReadyMessage(projectType),
                                        uriFormat: "%s://localhost:%s"
                                      },
                                     true);

    let debugOptions = ["FixFilePathCase"];

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
      showReturnValue: true,
      redirectOutput: true,
      debugOptions: debugOptions
    };
  }

  private async tryGetPrelaunchTask(prelaunchTask: string) : Promise<vscode.Task> | undefined {
    if (!prelaunchTask) {
      return undefined;
    }

    let tasks = await vscode.tasks.fetchTasks();

    if (tasks) {
      let results = tasks.filter(t => t.name === prelaunchTask);

      if (results && results.length > 0) {
        return results[0];
      }
    }

    return undefined;
  }

  private getServerReadyMessage(projectType: PythonProjectType) : string | undefined {
    switch (projectType) {
      case "django":
        return "Starting development server at (https?://\\S+|[0-9]+)";
      case "flask":
        return "Running on (https?://\\S+|[0-9]+)";
      default:
        return undefined
    }
  }

  private async getSemaphoreFilePath(folderName: string, os: PlatformOS) : Promise<string> {
    const launcherPath = await PythonExtensionHelper.getLauncherFolderPath();
    const filePath = launcherPath + `\\ptvsd\\dbg_${folderName}.sem`;

    return filePath.replace(/\\/g, "/");
  }

  private async ensureDebuggerReady(prelaunchTask: vscode.Task, debuggerSemaphorePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      vscode.tasks.onDidEndTask(async e => {
        if (e.execution.task === prelaunchTask) {
          let retries = 0;
          let created = false;

          while (++retries < 50 && !created) {
              created = await fse.pathExists(debuggerSemaphorePath);
              await fse.remove(debuggerSemaphorePath);

              await delay(500);
          }

          if (created) {
            resolve();
          } else {
            reject();
          }
      }});
    })
  }
}

const dockerClient = new CliDockerClient(new ChildProcessProvider());
const osProvider = new LocalOSProvider();

export const pythonDebugHelper = new PythonDebugHelper(dockerClient, osProvider);
