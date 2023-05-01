import { ExtensionContext, tasks } from 'vscode';
import { DockerBuildTaskProvider } from '../tasks/DockerBuildTaskProvider';
import { DockerComposeTaskProvider } from '../tasks/DockerComposeTaskProvider';
import { DockerRunTaskProvider } from '../tasks/DockerRunTaskProvider';
import { netCoreTaskHelper } from '../tasks/netcore/NetCoreTaskHelper';
import { nodeTaskHelper } from '../tasks/node/NodeTaskHelper';
import { pythonTaskHelper } from '../tasks/python/PythonTaskHelper';


export function registerTaskProviders(ctx: ExtensionContext): void {
    const helpers = {
        netCore: netCoreTaskHelper,
        node: nodeTaskHelper,
        python: pythonTaskHelper
    };

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-build',
            new DockerBuildTaskProvider(helpers)
        )
    );

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-run',
            new DockerRunTaskProvider(helpers)
        )
    );

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-compose',
            new DockerComposeTaskProvider()
        )
    );
}
