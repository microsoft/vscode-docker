import * as path from "path";
import { Uri, commands, workspace } from "vscode";
import { ext } from "../../extensionVariables";
import { NetChooseBuildTypeContext, netContainerBuild } from "../../scaffolding/wizard/net/NetContainerBuild";
import { AllNetContainerBuildOptions } from "../../scaffolding/wizard/net/NetSdkChooseBuildStep";
import { getDefaultContainerName } from "../../tasks/TaskHelper";
import { inferProjPath } from "../../tasks/netSdk/netSdkTaskUtils";
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerDebugScaffoldContext } from "../DebugHelper";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";
import { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions } from "../netcore/NetCoreDebugHelper";

const NetSdkTaskFullSymbol = 'dotnet-container-sdk: debug';
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
            await ext.context.workspaceState.update('netSdkProjPath', undefined); // reset the project path
            const appProjectAbsolutePath = await inferProjPath(context.actionContext, context.folder);

            configurations.push({
                name: 'Docker .NET Container SDK Launch',
                type: 'docker',
                request: 'launch',
                preLaunchTask: NetSdkTaskFullSymbol,
                containerName: getDefaultContainerName(this.getProjectFolderNameFromProjectPath(appProjectAbsolutePath.absoluteFilePath), "dev"),
                netCore: {
                    appProject: unresolveWorkspaceFolder(appProjectAbsolutePath.absoluteFilePath, workspace.workspaceFolders[0]),
                },
            });
        } else {
            await commands.executeCommand('vscode-docker.configure');
        }

        return configurations;
    }

    /**
     * Checks if the launch task is using the .NET SDK Container build
     * @param preLaunchTask
     * @returns true if the launch task is using the .NET SDK Container build
     *          false otherwise
     */
    public isDotNetSdkBuild(preLaunchTask: string): boolean {
        return preLaunchTask === NetSdkTaskFullSymbol;
    }

    public getProjectFolderNameFromProjectPath(projectPath: string): string {
        const projFileUri = Uri.file(path.dirname(projectPath));
        return path.basename(projFileUri.fsPath);
    }
}

export const netSdkDebugHelper = new NetSdkDebugHelper();
