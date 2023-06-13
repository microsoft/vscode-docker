import { commands } from "vscode";
import { NetChooseBuildTypeContext, netContainerBuild } from "../../scaffolding/wizard/net/NetContainerBuild";
import { AllNetContainerBuildOptions } from "../../scaffolding/wizard/net/NetSdkChooseBuildStep";
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
            configurations.push({
                name: 'Docker .NET Container SDK Launch',
                type: 'docker',
                request: 'launch',
                preLaunchTask: NetSdkTaskFullSymbol,
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder),
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
}

export const netSdkDebugHelper = new NetSdkDebugHelper();
