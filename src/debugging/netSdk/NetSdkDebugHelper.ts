/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import * as path from "path";
import { Uri, WorkspaceFolder, commands, tasks } from "vscode";
import { NetChooseBuildTypeContext, netContainerBuild } from "../../scaffolding/wizard/net/NetContainerBuild";
import { AllNetContainerBuildOptions } from "../../scaffolding/wizard/net/NetSdkChooseBuildStep";
import { getDefaultContainerName } from "../../tasks/TaskHelper";
import { netSdkRunTaskProvider } from "../../tasks/netSdk/NetSdkRunTaskProvider";
import { NetSdkRunTaskType } from "../../tasks/netSdk/netSdkTaskUtils";
import { PlatformOS } from "../../utils/platform";
import { quickPickProjectFileItem } from "../../utils/quickPickFile";
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerDebugContext, DockerDebugScaffoldContext } from "../DebugHelper";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";
import { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions } from "../netcore/NetCoreDebugHelper";

export class NetSdkDebugHelper extends NetCoreDebugHelper {

    private static projPath: string | undefined;

    public async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: NetCoreDebugScaffoldingOptions): Promise<DockerDebugConfiguration[]> {

        const configurations: DockerDebugConfiguration[] = [];

        const netCoreBuildContext: NetChooseBuildTypeContext = {
            ...context.actionContext,
            scaffoldType: 'debugging',
            workspaceFolder: context.folder,
        };

        await netContainerBuild(netCoreBuildContext);
        if (netCoreBuildContext?.containerBuildOptions === AllNetContainerBuildOptions[1]) {
            const appProjectAbsolutePath = await this.inferProjPath(context.actionContext, context.folder);

            configurations.push({
                name: 'Docker .NET Container SDK Launch',
                type: 'docker',
                request: 'launch',
                netCore: {
                    appProject: unresolveWorkspaceFolder(appProjectAbsolutePath, context.folder),
                    buildWithSdk: true,
                },
            });
        } else {
            await commands.executeCommand('vscode-docker.configure');
        }

        return configurations;
    }

    public async afterResolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<void> {
        const { task, promise } = netSdkRunTaskProvider.createNetSdkRunTask(
            {
                type: NetSdkRunTaskType,
                netCore: {
                    appProject: await this.inferProjPath(context.actionContext, context.folder),
                }
            }
        );
        await tasks.executeTask(task);
        await promise;
    }

    private async inferProjPath(context: IActionContext, folder: WorkspaceFolder): Promise<string> {
        if (NetSdkDebugHelper.projPath) {
            return NetSdkDebugHelper.projPath;
        }

        const projFileItem = await quickPickProjectFileItem(context, undefined, folder, 'No .csproj file could be found.');
        NetSdkDebugHelper.projPath = projFileItem.absoluteFilePath; // save the path for future use
        return projFileItem.absoluteFilePath;
    }

    /**
     * Overwite the base implementation to infer the container name from the project path (appProject)
     * instead of the folder name
     */
    protected async loadExternalInfo(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        NetSdkDebugHelper.projPath = debugConfiguration.netCore.appProject;

        const associatedTask = context.runDefinition;
        return {
            configureSsl: !!(associatedTask?.netCore?.configureSsl),
            containerName: this.inferDotNetSdkContainerName(debugConfiguration),
            platformOS: associatedTask?.dockerRun?.os || 'Linux',
        };
    }

    public inferDotNetSdkContainerName(debugConfiguration: DockerDebugConfiguration): string {
        const projFileUri = Uri.file(path.dirname(debugConfiguration.netCore.appProject));
        return getDefaultContainerName(path.basename(projFileUri.fsPath), "dev");
    }
}

export const netSdkDebugHelper = new NetSdkDebugHelper();
