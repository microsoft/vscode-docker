import { DockerBuildTaskDefinition } from '../tasks/DockerBuildTaskProvider';
import { DockerRunTaskDefinition } from '../tasks/DockerRunTaskProvider';
import netCoreTaskHelper, { NetCoreTaskScaffoldingOptions } from '../tasks/netcore/NetCoreTaskHelper';
import nodeTaskHelper from '../tasks/node/NodeTaskHelper';
import { addTask } from '../tasks/TaskHelper';
import { addDebugConfiguration, InitializeDebugContext } from './DebugHelper';
import { DockerDebugConfiguration } from './DockerDebugConfigurationProvider';
import netCoreDebugHelper, { NetCoreDebugScaffoldingOptions } from './netcore/NetCoreDebugHelper';
import nodeDebugHelper from './node/NodeDebugHelper';

export type NetCoreScaffoldingOptions = NetCoreDebugScaffoldingOptions | NetCoreTaskScaffoldingOptions;

export interface IDockerDebugScaffoldingProvider {
    initializeNetCoreForDebugging(context: InitializeDebugContext, options?: NetCoreScaffoldingOptions): Promise<void>;
    initializeNodeForDebugging(context: InitializeDebugContext): Promise<void>;
}

export class DockerDebugScaffoldingProvider implements IDockerDebugScaffoldingProvider {
    public async initializeNetCoreForDebugging(context: InitializeDebugContext, options?: NetCoreScaffoldingOptions): Promise<void> {
        await this.initializeForDebugging(
            context,
            (_context: InitializeDebugContext) => netCoreDebugHelper.provideDebugConfigurations(_context, options),
            (_context: InitializeDebugContext) => netCoreTaskHelper.provideDockerBuildTasks(_context, options),
            (_context: InitializeDebugContext) => netCoreTaskHelper.provideDockerRunTasks(_context, options));
    }

    public async initializeNodeForDebugging(context: InitializeDebugContext): Promise<void> {
        await this.initializeForDebugging(
            context,
            (_context: InitializeDebugContext) => nodeDebugHelper.provideDebugConfigurations(_context),
            (_context: InitializeDebugContext) => nodeTaskHelper.provideDockerBuildTasks(_context),
            (_context: InitializeDebugContext) => nodeTaskHelper.provideDockerRunTasks(_context));
    }

    private async initializeForDebugging(
        context: InitializeDebugContext,
        provideDebugConfigurations: (_context: InitializeDebugContext) => Promise<DockerDebugConfiguration[]>,
        provideDockerBuildTasks: (_context: InitializeDebugContext) => Promise<DockerBuildTaskDefinition[]>,
        provideDockerRunTasks: (_context: InitializeDebugContext) => Promise<DockerRunTaskDefinition[]>): Promise<void> {
        const debugConfigurations = await provideDebugConfigurations(context);

        const buildTasks = await provideDockerBuildTasks(context);

        for (const buildTask of buildTasks) {
            await addTask(buildTask);
        }

        const runTasks = await provideDockerRunTasks(context);

        for (const runTask of runTasks) {
            await addTask(runTask);
        }

        for (const debugConfiguration of debugConfigurations) {
            await addDebugConfiguration(debugConfiguration);
        }
    }
}

const dockerDebugScaffoldingProvider: IDockerDebugScaffoldingProvider = new DockerDebugScaffoldingProvider();

export default dockerDebugScaffoldingProvider;
