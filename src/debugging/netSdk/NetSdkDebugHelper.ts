import { commands } from "vscode";
import { NetChooseBuildTypeContext, netContainerBuild } from "../../scaffolding/wizard/net/NetContainerBuild";
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerDebugScaffoldContext } from "../DebugHelper";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";
import { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions } from "../netcore/NetCoreDebugHelper";

const netContainerSdkBuildSymbol = 'dotnet-container-sdk: debug';
export class NetSdkDebugHelper extends NetCoreDebugHelper {

    public async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: NetCoreDebugScaffoldingOptions): Promise<DockerDebugConfiguration[]> {

        const providers: DockerDebugConfiguration[] = [];

        const netCoreBuildContext: NetChooseBuildTypeContext = {
            ...context.actionContext,
            scaffoldType: 'debugging',
            workspaceFolder: context.folder,
        };

        await netContainerBuild(netCoreBuildContext);

        if (netCoreBuildContext?.containerBuildOptions === 'Use .NET SDK') {
            providers.push({
                name: 'Docker .NET Container SDK Launch',
                type: 'docker',
                request: 'launch',
                preLaunchTask: netContainerSdkBuildSymbol,
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder),
                },
            });
        } else {
            await commands.executeCommand('vscode-docker.configure');
        }

        return providers;
    }

    /**
     * Checks if the launch task is using the .NET SDK Container build
     * @param preLaunchTask
     * @returns true if the launch task is using the .NET SDK Container build
     *          false otherwise
     */
    public isDotnetSdkBuild(preLaunchTask: string): boolean {
        return preLaunchTask && preLaunchTask === netContainerSdkBuildSymbol;
    }
}

export const netSdkDebugHelper = new NetSdkDebugHelper();
