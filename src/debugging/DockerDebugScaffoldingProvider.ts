import { DockerBuildTaskDefinition } from '../tasks/DockerBuildTaskProvider';
import { DockerRunTaskDefinition } from '../tasks/DockerRunTaskProvider';
import netCoreTaskHelper, { NetCoreTaskHelper, NetCoreTaskScaffoldingOptions } from '../tasks/netcore/NetCoreTaskHelper';
import nodeTaskHelper, { NodeTaskHelper } from '../tasks/node/NodeTaskHelper';
import { addTask } from '../tasks/TaskHelper';
import { addDebugConfiguration, InitializeDebugContext } from './DebugHelper';
import { DockerDebugConfiguration } from './DockerDebugConfigurationProvider';
import netCoreDebugHelper, { NetCoreDebugHelper, NetCoreDebugScaffoldingOptions } from './netcore/NetCoreDebugHelper';
import nodeDebugHelper, { NodeDebugHelper } from './node/NodeDebugHelper';

export type NetCoreScaffoldingOptions = NetCoreDebugScaffoldingOptions | NetCoreTaskScaffoldingOptions;

export interface IDockerDebugScaffoldingProvider {
    initializeNetCoreForDebugging(context: InitializeDebugContext, options?: NetCoreScaffoldingOptions): Promise<void>;
    initializeNodeForDebugging(context: InitializeDebugContext): Promise<void>;
}

export class DockerDebugScaffoldingProvider implements IDockerDebugScaffoldingProvider {
    constructor(
        private readonly _netCoreDebugHelper: NetCoreDebugHelper,
        private readonly _netCoreTaskHelper: NetCoreTaskHelper,
        private readonly _nodeDebugHelper: NodeDebugHelper,
        private readonly _nodeTaskHelper: NodeTaskHelper) {
    }

    public async initializeNetCoreForDebugging(context: InitializeDebugContext, options?: NetCoreScaffoldingOptions): Promise<void> {
        await this.initializeForDebugging(
            () => this._netCoreDebugHelper.provideDebugConfigurations(context, options),
            () => this._netCoreTaskHelper.provideDockerBuildTasks(context, options),
            () => this._netCoreTaskHelper.provideDockerRunTasks(context, options));
    }

    public async initializeNodeForDebugging(context: InitializeDebugContext): Promise<void> {
        await this.initializeForDebugging(
            () => this._nodeDebugHelper.provideDebugConfigurations(context),
            () => this._nodeTaskHelper.provideDockerBuildTasks(context),
            () => this._nodeTaskHelper.provideDockerRunTasks(context));
    }

    private async initializeForDebugging(
        provideDebugConfigurations: () => Promise<DockerDebugConfiguration[]>,
        provideDockerBuildTasks: () => Promise<DockerBuildTaskDefinition[]>,
        provideDockerRunTasks: () => Promise<DockerRunTaskDefinition[]>): Promise<void> {
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
