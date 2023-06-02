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
                name: 'Docker .NET Launch',
                type: 'docker',
                request: 'launch',
                platform: 'netSdk',
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder),
                    enableDebugging: true,
                    appOutput: this.getAppOutput(context),
                },
                preLaunchTask: 'dotnet-sdk-run: sdk-debug',
            });
        } else {
            await commands.executeCommand('vscode-docker.configure');
        }

        return providers;
    }

    private getAppOutput(context: DockerDebugScaffoldContext): string {
        const folderName = context.folder.name || 'dotnet';
        return `${folderName}.dll`;
    }
}

export const netSdkDebugHelper = new NetSdkDebugHelper();
