/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import { Uri, commands, l10n, tasks } from "vscode";
import { ext } from "../../extensionVariables";
import { NetChooseBuildTypeContext, netContainerBuild } from "../../scaffolding/wizard/net/NetContainerBuild";
import { AllNetContainerBuildOptions, NetContainerBuildOptionsKey } from "../../scaffolding/wizard/net/NetSdkChooseBuildStep";
import { getDefaultContainerName } from "../../tasks/TaskHelper";
import { netSdkRunTaskProvider } from "../../tasks/netSdk/NetSdkRunTaskProvider";
import { normalizeArchitectureToRidArchitecture, normalizeOsToRidOs } from "../../tasks/netSdk/netSdkTaskUtils";
import { getNetCoreProjectInfo } from "../../utils/netCoreUtils";
import { getDockerOSType } from "../../utils/osUtils";
import { PlatformOS } from "../../utils/platform";
import { quickPickProjectFileItem } from "../../utils/quickPickFile";
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerDebugContext, DockerDebugScaffoldContext } from "../DebugHelper";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";
import { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions } from "../netcore/NetCoreDebugHelper";

export class NetSdkDebugHelper extends NetCoreDebugHelper {

    public async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: NetCoreDebugScaffoldingOptions): Promise<DockerDebugConfiguration[]> {

        const configurations: DockerDebugConfiguration[] = [];

        const netCoreBuildContext: NetChooseBuildTypeContext = {
            ...context.actionContext,
            scaffoldType: 'debugging',
            workspaceFolder: context.folder,
        };

        await netContainerBuild(netCoreBuildContext);
        if (netCoreBuildContext?.containerBuildOptions === AllNetContainerBuildOptions[1]) {
            const appProjectAbsolutePath = await this.inferProjPath(context, options);

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
                netCore: {
                    appProject: await this.inferProjPath(undefined, debugConfiguration.netCore),
                }
            }
        );

        await tasks.executeTask(task);

        try {
            await promise;
        } catch (error) {
            await ext.context.workspaceState.update(NetContainerBuildOptionsKey, '');
            throw error;
        }
    }

    protected override async inferAppOutput(debugConfiguration: DockerDebugConfiguration): Promise<string> {
        const ridOS = await normalizeOsToRidOs();
        const ridArchitecture = await normalizeArchitectureToRidArchitecture();
        const additionalProperties = `/p:ContainerRuntimeIdentifier="${ridOS}-${ridArchitecture}"`;

        let projectInfo: string[];
        try {
            projectInfo = await getNetCoreProjectInfo('GetProjectProperties', debugConfiguration.netCore?.appProject, additionalProperties);
        } catch (error) {
            await ext.context.workspaceState.update(NetContainerBuildOptionsKey, '');
            throw error;
        }

        if (projectInfo.length >= 5) { // if .NET has support for SDK Build
            // fifth is whether .NET Web apps supports SDK Containers
            if (projectInfo[4] === 'true') {
                return ridOS === 'win' // fourth is output path
                    ? path.win32.normalize(projectInfo[3])
                    : path.posix.normalize(projectInfo[3]);
            } else {
                await ext.context.workspaceState.update(NetContainerBuildOptionsKey, '');
                throw new Error(l10n.t("Your current project configuration or .NET SDK version doesn't support SDK Container build. Please choose a compatible project or update .NET SDK."));
            }
        }

        await ext.context.workspaceState.update(NetContainerBuildOptionsKey, '');
        throw new Error(l10n.t('Unable to determine assembly output path.'));
    }

    protected override async loadExternalInfo(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        const associatedTask = context.runDefinition;
        return {
            configureSsl: !!(associatedTask?.netCore?.configureSsl),
            containerName: this.inferDotNetSdkContainerName(debugConfiguration),
            platformOS: await getDockerOSType() === "windows" ? 'Windows' : 'Linux',
        };
    }

    protected override inferAppContainerOutput(appOutput: string, platformOS: PlatformOS): string {
        return appOutput;
    }

    private inferDotNetSdkContainerName(debugConfiguration: DockerDebugConfiguration): string {
        const projFileUri = Uri.file(path.dirname(debugConfiguration.netCore.appProject));
        return getDefaultContainerName(path.basename(projFileUri.fsPath), "dev");
    }

    /**
     * @returns the project path stored in NetCoreDebugScaffoldingOptions,
     *          otherwise prompts the user to select a .csproj file and stores the path
     *          in the static variable projPath
     */
    private async inferProjPath(context: DockerDebugScaffoldContext, options?: NetCoreDebugScaffoldingOptions): Promise<string> {
        options = options || {};
        if (options.appProject) {
            return options.appProject;
        }

        const projFileItem = await quickPickProjectFileItem(context.actionContext, undefined, context.folder, 'No project file could be found.');
        options.appProject = projFileItem.absoluteFilePath; // save the path for future use
        return options.appProject;
    }
}

export const netSdkDebugHelper = new NetSdkDebugHelper();
