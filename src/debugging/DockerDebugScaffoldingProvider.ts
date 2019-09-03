import { WorkspaceFolder } from 'vscode';
import { DockerBuildTaskDefinition } from '../tasks/DockerBuildTaskProvider';
import { DockerRunTaskDefinition } from '../tasks/DockerRunTaskProvider';
import { NetCoreTaskHelper } from '../tasks/netcore/NetCoreTaskHelper';
import { NodeTaskHelper } from '../tasks/node/NodeTaskHelper';
import { addTask } from '../tasks/TaskHelper';
import { addDebugConfiguration } from './DebugHelper';
import { DockerDebugConfiguration } from './DockerDebugConfigurationProvider';
import { NetCoreDebugHelper, NetCoreScaffoldingOptions } from './netcore/NetCoreDebugHelper';
import { NodeDebugHelper } from './node/NodeDebugHelper';

export class DockerDebugScaffoldingProvider {
    public async initializeForDebuggingNetCore(folder: WorkspaceFolder, options?: NetCoreScaffoldingOptions): Promise<void> {
        const debugHelper = new NetCoreDebugHelper();
        const taskHelper = new NetCoreTaskHelper();

        await this.initializeForDebugging(
            () => debugHelper.provideDebugConfigurations(folder, options),
            () => taskHelper.provideDockerBuildTasks(folder),
            () => taskHelper.provideDockerRunTasks(folder));
    }

    public async initializeForDebuggingNode(folder: WorkspaceFolder): Promise<void> {
        const debugHelper = new NodeDebugHelper();
        const taskHelper = new NodeTaskHelper();

        await this.initializeForDebugging(
            () => debugHelper.provideDebugConfigurations(folder),
            () => taskHelper.provideDockerBuildTasks(folder),
            () => taskHelper.provideDockerRunTasks(folder));
    }

    private async initializeForDebugging(
        provideDebugConfigurations: () => Promise<DockerDebugConfiguration[]>,
        provideDockerBuildTasks: () => Promise<DockerBuildTaskDefinition[]>,
        provideDockerRunTasks: () => Promise<DockerRunTaskDefinition[]>) : Promise<void> {
        const debugConfigurations = await provideDebugConfigurations();

        const buildTasks = await provideDockerBuildTasks();

        for (const buildTask of buildTasks) {
            await addTask(buildTask);
        }

        const runTasks = await provideDockerRunTasks();

        for (const runTask of runTasks) {
            await addTask(runTask);
        }

        for (const debugConfiguration of debugConfigurations) {
            await addDebugConfiguration(debugConfiguration);
        }
    }
}
