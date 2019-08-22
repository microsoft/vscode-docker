import * as fse from 'fs-extra';
import * as path from 'path';
import { CancellationToken, workspace, WorkspaceFolder } from 'vscode';
import { DockerBuildOptions, DockerBuildTask } from '../DockerBuildTaskProvider';
import { DockerRunOptions, DockerRunTask } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';
import { FileService } from 'azure-storage';

export interface NodeTaskBuildOptions {
    package?: string;
}

export interface NodeTaskRunOptions {
    enableDebugging?: boolean;
    inspectMode?: 'default' | 'break';
    inspectPort?: number;
    package?: string;
}

export type NodeTaskHelperType = TaskHelper<NodeTaskBuildOptions, NodeTaskRunOptions>;

export class NodeTaskHelper implements NodeTaskHelperType {
    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        return await Promise.resolve([]);
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        return await Promise.resolve([]);
    }

    public async resolveDockerBuildOptions(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, helperOptions: NodeTaskBuildOptions | undefined, token?: CancellationToken): Promise<DockerBuildOptions> {
        const packagePath = NodeTaskHelper.inferPackagePath(helperOptions && helperOptions.package, folder);

        if (buildOptions.context === undefined) {
            buildOptions.context = NodeTaskHelper.inferBuildContextPath(buildOptions && buildOptions.context, folder, packagePath);
        }

        if (buildOptions.tag === undefined) {
            buildOptions.tag = await NodeTaskHelper.inferTag(packagePath);
        }

        return await Promise.resolve(buildOptions);
    }

    public async resolveDockerRunOptions(folder: WorkspaceFolder, runOptions: DockerRunOptions, helperOptions: NodeTaskRunOptions | undefined, token?: CancellationToken): Promise<DockerRunOptions> {
        const packagePath = NodeTaskHelper.inferPackagePath(helperOptions && helperOptions.package, folder);

        if (runOptions.image === undefined) {
            runOptions.image = await NodeTaskHelper.inferTag(packagePath);
        }

        if (helperOptions && helperOptions.enableDebugging) {
            if (runOptions.command !== undefined) {
                throw new Error('Debugging cannot be enabled when the Docker run command has been overridden.');
            }

            const inspectMode = helperOptions.inspectMode || 'default';
            const inspectArg = inspectMode === 'break' ? '--inspect-brk' : '--inspect';
            const inspectPort = helperOptions.inspectPort !== undefined ? helperOptions.inspectPort : 9229;

            // TODO: Infer startup script...
            runOptions.command = `node ${inspectArg}=0.0.0.0:${inspectPort} ./bin/www`;

            if (runOptions.ports === undefined) {
                runOptions.ports = [];
            }

            // If not already defined, create a mapping for the inspect port between container and host...
            if (runOptions.ports.find(port => port.containerPort === inspectPort) === undefined) {
                runOptions.ports.push({
                    containerPort: inspectPort,
                    // TODO: Can this mapping be dynamic?
                    hostPort: inspectPort
                });
            }
        }

        return await Promise.resolve(runOptions);
    }

    private static inferPackagePath(packageFile: string | undefined, folder: WorkspaceFolder): string {
        if (packageFile !== undefined) {
            return this.resolveFilePath(packageFile, folder);
        } else {
            return path.join(folder.uri.fsPath, 'package.json');
        }
    }

    private static inferBuildContextPath(buildContext: string | undefined, folder: WorkspaceFolder, packagePath: string): string {
        if (buildContext !== undefined) {
            return this.resolveFilePath(buildContext, folder);
        } else {
            return path.dirname(packagePath);
        }
    }

    private static async inferTag(packagePath: string): Promise<string> {
        const packageBaseDirName = await Promise.resolve(path.basename(path.dirname(packagePath)));

        return `${packageBaseDirName}:latest`;
    }

    private static resolveFilePath(filePath: string, folder: WorkspaceFolder): string {
        const replacedPath = filePath.replace(/\$\{workspaceFolder\}/gi, folder.uri.fsPath);

        return path.resolve(folder.uri.fsPath, replacedPath);
    }
}
