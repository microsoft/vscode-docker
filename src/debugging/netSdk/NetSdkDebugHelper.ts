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
import { getContainerNameWithTag } from "../../tasks/TaskHelper";
import { NetSdkRunTaskDefinition, netSdkRunTaskProvider } from "../../tasks/netSdk/NetSdkRunTaskProvider";
import { normalizeArchitectureToRidArchitecture, normalizeOsToRidOs } from "../../tasks/netSdk/netSdkTaskUtils";
import { getNetCoreProjectInfo } from "../../utils/netCoreUtils";
import { getDockerOSType } from "../../utils/osUtils";
import { PlatformOS } from "../../utils/platform";
import { quickPickProjectFileItem } from "../../utils/quickPickFile";
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerDebugContext, DockerDebugScaffoldContext, ResolvedDebugConfiguration } from "../DebugHelper";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";
import { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions } from "../netcore/NetCoreDebugHelper";

export class NetSdkDebugHelper extends NetCoreDebugHelper {

    private projectInfo: string[] | undefined;

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
        const projectInfo = await this.getProjectInfo(debugConfiguration);
        const runDefinition: Omit<NetSdkRunTaskDefinition, "type"> = {
            netCore: {
                appProject: debugConfiguration?.netCore?.appProject || await this.inferProjPath(context.actionContext, context.folder),
            },
            dockerRun: {
                containerName: projectInfo[5]
            }
        };

        const { task, promise } = netSdkRunTaskProvider.createNetSdkRunTask(runDefinition);
        await tasks.executeTask(task);
        await promise;
    }

    protected override async inferAppOutput(debugConfiguration: DockerDebugConfiguration): Promise<string> {
        const projectInfo = await this.getProjectInfo(debugConfiguration);

        if (projectInfo.length >= 5) { // if .NET has support for SDK Build
            // fifth is whether .NET Web apps supports SDK Containers
            if (projectInfo[4] === 'true') {
                return await getDockerOSType() === 'windows' // fourth is output path
                    ? path.win32.normalize(projectInfo[3])
                    : path.posix.normalize(projectInfo[3]);
            } else {
                throw new Error(l10n.t("Your current project configuration or .NET SDK version doesn't support SDK Container build. Please choose a compatible project or update .NET SDK."));
            }
        }

        throw new Error(l10n.t('Unable to determine assembly output path.'));
    }

    protected override async loadExternalInfo(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        const associatedTask = context.runDefinition;
        const projectInfo = await this.getProjectInfo(debugConfiguration);
        return {
            configureSsl: !!(associatedTask?.netCore?.configureSsl),
            containerName: getContainerNameWithTag(projectInfo[5], "dev"),
            platformOS: await getDockerOSType() === "windows" ? 'Windows' : 'Linux',
        };
    }

    protected override inferAppContainerOutput(appOutput: string, platformOS: PlatformOS): string {
        return appOutput;
    }

    private async getProjectInfo(debugConfiguration: DockerDebugConfiguration): Promise<string[]> {
        if (this.projectInfo && this.projectInfo.length >= 6) {
            return this.projectInfo;
        }

        const ridOS = await normalizeOsToRidOs();
        const ridArchitecture = await normalizeArchitectureToRidArchitecture();
        const additionalProperties = `/p:ContainerRuntimeIdentifier="${ridOS}-${ridArchitecture}"`;

        const projectInfo = await getNetCoreProjectInfo('GetProjectProperties', debugConfiguration.netCore?.appProject, additionalProperties);

        if (projectInfo.length < 6 || !projectInfo[5]) {
            throw new Error(l10n.t("Your current project configuration or .NET SDK version doesn't support SDK Container build. Please choose a compatible project or update .NET SDK."));
        }

        this.projectInfo = projectInfo;
        return projectInfo;
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
