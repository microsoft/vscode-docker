/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// This will eventually be replaced by an API in the Python extension. See https://github.com/microsoft/vscode-python/issues/7282

import * as path from 'path';
import * as vscode from "vscode";
import * as fse from 'fs-extra';
import * as os from 'os';
import { delay } from '../../utils/delay';
import { PythonFileTarget, PythonModuleTarget } from '../../debugging/python/PythonDebugHelper';
import CliDockerClient from '../../debugging/coreclr/CliDockerClient';

export namespace PythonExtensionHelper {
  export interface DebugLaunchOptions {
    host?: string;
    port?: number;
    wait?: boolean;
  }

  export function getDebuggerEnvironmentVars(folder: string): { [key: string]: string }{
    return { ["PTVSD_LOG_DIR"]: `/dbglogs` };
  }

  export function getSemaphoreFilePath(folderName: string) : string {
    return path.join(os.tmpdir(), folderName, "ptvsd-1.log");
  }

  export async function ensureDebuggerReady(prelaunchTask: vscode.Task, debuggerSemaphorePath: string, containerName: string, cliDockerClient: CliDockerClient): Promise<void> {
    return new Promise((resolve, reject) => {
      vscode.tasks.onDidEndTask(async e => {
        if (e.execution.task === prelaunchTask) {
          const containerRunning = await cliDockerClient.inspectObject(containerName, { format: "{{.State.Running}}" });

          if (containerRunning == "false"){
            reject("Failed to attach the debugger, please see the terminal output for more details.");
          }

          const maxRetriesCount = 20;
          let retries = 0;
          let created = false;

          while (++retries < maxRetriesCount && !created) {
              if (fse.existsSync(debuggerSemaphorePath)){
                const contents = fse.readFileSync(debuggerSemaphorePath);

                created = contents.toString().indexOf("Starting server daemon on") >= 0;
                if (created){
                  break;
                }
              }

              await delay(500);
          }

          if (created) {
            resolve();
          } else {
            reject("Failed to attach the debugger within the alotted timeout.");
          }
      }});
    })
  }

  export function getRemoteLauncherCommand(target: PythonFileTarget | PythonModuleTarget, args?: string[], options?: DebugLaunchOptions): string {
    let fullTarget: string;

    if ((target as PythonFileTarget).file) {
      fullTarget = (target as PythonFileTarget).file;
    } else if ((target as PythonModuleTarget).module) {
      fullTarget = `-m ${(target as PythonModuleTarget).module}`;
    } else {
      throw new Error("One of either module or file must be provided.");
    }

    options = options || {};
    options.host = options.host || "0.0.0.0";
    options.port = options.port || 5678;
    options.wait = !!options.wait;
    args = args || [];

    return `/pydbg/ptvsd_launcher.py --default --host ${options.host} --port ${options.port} ${options.wait ? "--wait" : ""} ${fullTarget} ${args.join(" ")}`;
  }

  export function getLauncherFolderPath(): string {
    const pyExt = vscode.extensions.getExtension("ms-python.python");

    if (!pyExt) {
      throw new Error("The Python extension must be installed.");
    }

    return path.join(pyExt.extensionPath, "pythonFiles");
  }
}
