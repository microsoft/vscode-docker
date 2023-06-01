import { commands } from "vscode";
import { NetChooseBuildTypeContext, netContainerBuild } from "../../scaffolding/wizard/net/netContainerBuild";
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerDebugScaffoldContext } from "../DebugHelper";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";
import { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions } from "../netcore/NetCoreDebugHelper";

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
                platform: 'netCore',
                name: 'Docker .NET Launch',
                type: 'docker',
                request: 'launch',
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder),
                    enableDebugging: true,
                },
                preLaunchTask: 'dotnet-sdk-run: sdk-debug',
            });
        } else {
            await commands.executeCommand('vscode-docker.configure');
        }

        return providers;
    }

}

export const netSdkDebugHelper = new NetSdkDebugHelper();
