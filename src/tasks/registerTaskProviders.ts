import { ExtensionContext, tasks } from 'vscode';
import { DockerBuildTaskProvider } from './DockerBuildTaskProvider';
import { DockerComposeTaskProvider } from './DockerComposeTaskProvider';
import { DockerRunTaskProvider } from './DockerRunTaskProvider';
import { netCoreTaskHelper } from './netcore/NetCoreTaskHelper';
import { nodeTaskHelper } from './node/NodeTaskHelper';
import { pythonTaskHelper } from './python/PythonTaskHelper';


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
