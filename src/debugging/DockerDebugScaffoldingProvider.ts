import { WorkspaceFolder } from 'vscode';
import { DockerBuildTaskDefinition } from '../tasks/DockerBuildTaskProvider';
import { DockerRunTaskDefinition } from '../tasks/DockerRunTaskProvider';
import netCoreTaskHelper, { NetCoreTaskHelper } from '../tasks/netcore/NetCoreTaskHelper';
import nodeTaskHelper, { NodeTaskHelper } from '../tasks/node/NodeTaskHelper';
import { addTask } from '../tasks/TaskHelper';
import { addDebugConfiguration } from './DebugHelper';
import { DockerDebugConfiguration } from './DockerDebugConfigurationProvider';
import netCoreDebugHelper, { NetCoreDebugHelper, NetCoreScaffoldingOptions } from './netcore/NetCoreDebugHelper';
import nodeDebugHelper, { NodeDebugHelper } from './node/NodeDebugHelper';

export interface IDockerDebugScaffoldingProvider {
    initializeNetCoreForDebugging(folder: WorkspaceFolder): Promise<void>;
    initializeNodeForDebugging(folder: WorkspaceFolder): Promise<void>;
}

export class DockerDebugScaffoldingProvider implements IDockerDebugScaffoldingProvider {
    constructor(
        private readonly _netCoreDebugHelper: NetCoreDebugHelper,
        private readonly _netCoreTaskHelper: NetCoreTaskHelper,
        private readonly _nodeDebugHelper: NodeDebugHelper,
        private readonly _nodeTaskHelper: NodeTaskHelper) {
    }

    public async initializeNetCoreForDebugging(folder: WorkspaceFolder, options?: NetCoreScaffoldingOptions): Promise<void> {
        await this.initializeForDebugging(
            () => this._netCoreDebugHelper.provideDebugConfigurations(folder, options),
            () => this._netCoreTaskHelper.provideDockerBuildTasks(folder),
            () => this._netCoreTaskHelper.provideDockerRunTasks(folder));
    }

    public async initializeNodeForDebugging(folder: WorkspaceFolder): Promise<void> {
        await this.initializeForDebugging(
            () => this._nodeDebugHelper.provideDebugConfigurations(folder),
            () => this._nodeTaskHelper.provideDockerBuildTasks(folder),
            () => this._nodeTaskHelper.provideDockerRunTasks(folder));
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

const dockerDebugScaffoldingProvider: IDockerDebugScaffoldingProvider = new DockerDebugScaffoldingProvider(netCoreDebugHelper, netCoreTaskHelper, nodeDebugHelper, nodeTaskHelper);

export default dockerDebugScaffoldingProvider;
