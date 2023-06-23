import * as path from "path";
import { Task, Uri, commands, l10n, tasks, workspace } from "vscode";
import { ext } from "../../extensionVariables";
import { NetChooseBuildTypeContext, netContainerBuild } from "../../scaffolding/wizard/net/NetContainerBuild";
import { AllNetContainerBuildOptions } from "../../scaffolding/wizard/net/NetSdkChooseBuildStep";
import { getDefaultContainerName } from "../../tasks/TaskHelper";
import { NetSdkRunTaskType, inferProjPath } from "../../tasks/netSdk/netSdkTaskUtils";
import { PlatformOS } from "../../utils/platform";
import { unresolveWorkspaceFolder } from "../../utils/resolveVariables";
import { DockerDebugContext, DockerDebugScaffoldContext } from "../DebugHelper";
import { DockerDebugConfiguration } from "../DockerDebugConfigurationProvider";
import { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions, NetCoreDockerDebugConfiguration } from "../netcore/NetCoreDebugHelper";

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
                netCore: {
                    appProject: unresolveWorkspaceFolder(appProjectAbsolutePath.absoluteFilePath, workspace.workspaceFolders[0]),
                    buildWithSdk: true,
                },
            });
        } else {
            await commands.executeCommand('vscode-docker.configure');
        }

        return configurations;
    }

    public async afterResolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<void> {
        const runTasks: Task[] = await tasks.fetchTasks({ type: NetSdkRunTaskType }) || [];
        const runTaskFirstEntry = runTasks.find(t => t.source === NetSdkRunTaskType);
        if (!runTaskFirstEntry) {
            throw Error(l10n.t('No .NET SDK run task found '));
        }
        const taskExecution = await tasks.executeTask(runTaskFirstEntry);

        const taskEndPromise = new Promise<void>((resolve, reject) => {
            const disposable = tasks.onDidEndTask(e => {
                if (e.execution === taskExecution) {
                    disposable.dispose();
                    resolve();
                }
            });
        });

        return taskEndPromise;
    }

    /**
     * Overwite the base implementation to infer the container name from the project path (appProject)
     * instead of the folder name
     */
    protected async loadExternalInfo(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        const associatedTask = context.runDefinition;

        return {
            configureSsl: !!(associatedTask?.netCore?.configureSsl),
            containerName: this.inferDotNetContainerName(debugConfiguration),
            platformOS: associatedTask?.dockerRun?.os || 'Linux',
        };
    }

    /**
     * Checks if the launch task is using the .NET SDK Container build
     * @param preLaunchTask
     * @returns true if the launch task is using the .NET SDK Container build
     *          false otherwise
     */
    public isDotNetSdkBuild(platformConfiguration: unknown): boolean {
        if (platformConfiguration
            && (platformConfiguration as NetCoreDockerDebugConfiguration).netCore
            && (platformConfiguration as NetCoreDockerDebugConfiguration).netCore.buildWithSdk
        ) {
            return true;
        }
        else if (platformConfiguration as { type: string }) {
            return (platformConfiguration as { type: string }).type === 'dotnet-container-sdk';
        }
        else {
            return false;
        }
    }

    public getProjectFolderNameFromProjectPath(projectPath: string): string {
        const projFileUri = Uri.file(path.dirname(projectPath));
        return path.basename(projFileUri.fsPath);
    }

    public inferDotNetContainerName(debugConfiguration: DockerDebugConfiguration): string {
        const projFileUri = Uri.file(path.dirname(debugConfiguration.netCore.appProject));
        return getDefaultContainerName(path.basename(projFileUri.fsPath), "dev");
    }
}

export const netSdkDebugHelper = new NetSdkDebugHelper();
