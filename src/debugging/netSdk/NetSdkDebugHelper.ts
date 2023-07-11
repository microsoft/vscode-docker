/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import * as path from "path";
import { WorkspaceFolder, commands, l10n, tasks } from "vscode";
import { ext } from "../../extensionVariables";
import { NetChooseBuildTypeContext, netContainerBuild } from "../../scaffolding/wizard/net/NetContainerBuild";
import { AllNetContainerBuildOptions, NetContainerBuildOptionsKey } from "../../scaffolding/wizard/net/NetSdkChooseBuildStep";
import { NetSdkRunTaskDefinition, netSdkRunTaskProvider } from "../../tasks/netSdk/NetSdkRunTaskProvider";
import { normalizeArchitectureToRidArchitecture, normalizeOsToRidOs } from "../../tasks/netSdk/netSdkTaskUtils";
import { getNetCoreProjectInfo } from "../../utils/netCoreUtils";
import { getDockerOSType } from "../../utils/osUtils";
import { PlatformOS } from "../../utils/platform";
import { quickPickProjectFileItem } from "../../utils/quickPickFile";
import { resolveVariables, unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerDebugContext, DockerDebugScaffoldContext, ResolvedDebugConfiguration, inferContainerName } from "../DebugHelper";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";
import { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions, NetCoreProjectProperties } from "../netcore/NetCoreDebugHelper";

export interface NetSdkProjectProperties extends NetCoreProjectProperties {
    containerWorkingDirectory: string;
    isSdkContainerSupportEnabled: boolean;
    imageName: string;
}

export class NetSdkDebugHelper extends NetCoreDebugHelper {

    public override async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: NetCoreDebugScaffoldingOptions): Promise<DockerDebugConfiguration[]> {
        const configurations: DockerDebugConfiguration[] = [];

        const netCoreBuildContext: NetChooseBuildTypeContext = {
            ...context.actionContext,
            scaffoldType: 'debugging',
            workspaceFolder: context.folder,
        };

        await netContainerBuild(netCoreBuildContext);
        if (netCoreBuildContext?.containerBuildOptions === AllNetContainerBuildOptions[1]) {
            const appProjectAbsolutePath = options?.appProject || await this.inferProjPath(context.actionContext, context.folder);

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

    public override async resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        try {
            return await super.resolveDebugConfiguration(context, debugConfiguration);
        } catch (error) {
            await ext.context.workspaceState.update(NetContainerBuildOptionsKey, '');
            throw error;
        }
    }

    public async afterResolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<void> {
        const runDefinition: Omit<NetSdkRunTaskDefinition, "type"> = {
            netCore: {
                appProject: debugConfiguration?.netCore?.appProject || await this.inferProjPath(context.actionContext, context.folder),
            },
            dockerRun: {
                image: context.runDefinition.dockerRun.image,
            }
        };

        const { task, promise } = netSdkRunTaskProvider.createNetSdkRunTask(runDefinition);
        await tasks.executeTask(task);
        await promise;
    }

    protected override async loadExternalInfo(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        const projectProperties = await this.getProjectProperties(debugConfiguration, context.folder);
        debugConfiguration.netCore.appOutput = await this.normalizeAppOutput(projectProperties.containerWorkingDirectory, projectProperties.isSdkContainerSupportEnabled);
        context.runDefinition = {
            ...context.runDefinition,
            dockerRun: {
                containerName: inferContainerName(debugConfiguration, context, projectProperties.imageName, "dev"),
                image: projectProperties.imageName,
            },
            netCore: {
                enableDebugging: true,
            }
        };

        return {
            configureSsl: false,
            containerName: context.runDefinition.dockerRun.containerName,
            platformOS: await getDockerOSType() === "windows" ? 'Windows' : 'Linux',
        };
    }

    protected override inferAppContainerOutput(appOutput: string, platformOS: PlatformOS): string {
        return appOutput;
    }

    protected override async getProjectProperties(debugConfiguration: DockerDebugConfiguration, folder?: WorkspaceFolder): Promise<NetSdkProjectProperties> {
        const ridOS = await normalizeOsToRidOs();
        const ridArchitecture = await normalizeArchitectureToRidArchitecture();
        const additionalProperties = `/p:ContainerRuntimeIdentifier="${ridOS}-${ridArchitecture}"`;
        const resolvedAppProject = resolveVariables(debugConfiguration.netCore?.appProject, folder);

        const projectInfo = await getNetCoreProjectInfo('GetProjectProperties', resolvedAppProject, additionalProperties);

        if (projectInfo.length < 6 || !projectInfo[5]) {
            throw new Error(l10n.t("Your current project configuration or .NET SDK version doesn't support SDK Container build. Please choose a compatible project or update .NET SDK."));
        }

        const projectProperties: NetSdkProjectProperties = {
            assemblyName: projectInfo[0],
            targetFramework: projectInfo[1],
            appOutput: projectInfo[2],
            containerWorkingDirectory: projectInfo[3],
            isSdkContainerSupportEnabled: projectInfo[4] === 'true',
            imageName: projectInfo[5],
        };

        return projectProperties;
    }

    private async normalizeAppOutput(unnormalizedContainerWorkingDirectory: string, isSdkContainerSupportEnabled: boolean): Promise<string> {
        if (isSdkContainerSupportEnabled) {
            return await getDockerOSType() === 'windows' // fourth is output path
                ? path.win32.normalize(unnormalizedContainerWorkingDirectory)
                : path.posix.normalize(unnormalizedContainerWorkingDirectory);
        } else {
            throw new Error(l10n.t("Your current project configuration or .NET SDK version doesn't support SDK Container build. Please choose a compatible project or update .NET SDK."));
        }
    }

    /**
     * @returns the project path stored in NetCoreDebugScaffoldingOptions,
     *          otherwise prompts the user to select a .csproj file and stores the path
     *          in the static variable projPath
     */
    private async inferProjPath(actionContext: IActionContext, folder: WorkspaceFolder): Promise<string> {
        const projFileItem = await quickPickProjectFileItem(actionContext, undefined, folder, 'No project file could be found.');
        return projFileItem.absoluteFilePath;
    }
}

export const netSdkDebugHelper = new NetSdkDebugHelper();
