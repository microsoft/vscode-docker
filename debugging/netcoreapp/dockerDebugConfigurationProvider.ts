/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { WorkspaceFolder, DebugConfigurationProvider, DebugConfiguration, CancellationToken, ProviderResult } from 'vscode';
import { DockerManager, LaunchResult } from './dockerManager';
import { PlatformType, OSProvider } from './osProvider';

interface DockerDebugBuildOptions {
    context?: string;
    dockerfile?: string;
    tag?: string;
    target?: string;
}

interface DockerDebugRunOptions {
    containerName?: string;
    os?: PlatformType;
}

interface DockerDebugOptions {
    appFolder?: string;
    appOutput?: string;
    build?: DockerDebugBuildOptions;
    run?: DockerDebugRunOptions;
}

interface DockerDebugConfiguration extends DebugConfiguration {
    dockerOptions?: DockerDebugOptions;
}

export class DockerDebugConfigurationProvider implements DebugConfigurationProvider {
    constructor(
        private readonly dockerManager: DockerManager,
        private readonly osProvider: OSProvider) {
    }

    provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        return [
            {
                name: 'Docker: Launch .NET Core',
                type: 'docker-netcoreapp',
                request: 'launch',
                preLaunchTask: 'build'
            }
        ];
    }

    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        if (folder) {
            return this.resolveDockerDebugConfiguration(folder, debugConfiguration);
        }

        return undefined;
    }

    private static resolveFolderPath(folderPath: string, folder: WorkspaceFolder): string {
        return folderPath.replace(/\$\{workspaceFolder\}/g, folder.uri.fsPath);
    }

    private async resolveDockerDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration): Promise<DebugConfiguration> {
        const appFolder = this.inferAppFolder(folder, debugConfiguration);

        const resolvedAppFolder = DockerDebugConfigurationProvider.resolveFolderPath(appFolder, folder);

        const context = this.inferContext(folder, resolvedAppFolder, debugConfiguration);

        const resolvedContext = DockerDebugConfigurationProvider.resolveFolderPath(context, folder);

        let dockerfile = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.build && debugConfiguration.dockerOptions.build.dockerfile
            ? DockerDebugConfigurationProvider.resolveFolderPath(debugConfiguration.dockerOptions.build.dockerfile, folder)
            : path.join(appFolder, 'Dockerfile'); // TODO: Omit dockerfile argument if not specified or possibly infer from context.

        dockerfile = DockerDebugConfigurationProvider.resolveFolderPath(dockerfile, folder);

        const target = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.build && debugConfiguration.dockerOptions.build.target
            ? debugConfiguration.dockerOptions.build.target
            : 'base'; // TODO: Omit target if not specified, or possibly infer from Dockerfile.

        const appName = path.basename(resolvedAppFolder);

        const tag = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.build && debugConfiguration.dockerOptions.build.tag
            ? debugConfiguration.dockerOptions.build.tag
            : `${appName.toLowerCase()}:dev`;

        const containerName = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.run && debugConfiguration.dockerOptions.run.containerName
            ? debugConfiguration.dockerOptions.run.containerName
            : `${appName}-dev`; // TODO: Use unique ID instead?

        const os = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.run && debugConfiguration.dockerOptions.run.os
            ? debugConfiguration.dockerOptions.run.os
            : 'Linux';

        const appOutput = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.appOutput
            ? debugConfiguration.dockerOptions.appOutput
            : this.osProvider.pathJoin(os, 'bin', 'Debug', 'netcoreapp2.0', `${appName}.dll`); // TODO: Infer build configuration.

        const result = await this.dockerManager.prepareForLaunch({
            appFolder: resolvedAppFolder,
            appOutput,
            build: {
                context: resolvedContext,
                dockerfile,
                tag,
                target
            },
            run: {
                containerName,
                os,
            }
        });

        return this.createConfiguration(debugConfiguration, appFolder, result);
    }

    private inferAppFolder(folder: WorkspaceFolder, configuration: DockerDebugConfiguration): string {
        return configuration.dockerOptions && configuration.dockerOptions.appFolder
            ? configuration.dockerOptions.appFolder
            : folder.uri.fsPath;
    }

    private inferContext(folder: WorkspaceFolder, resolvedAppFolder: string, configuration: DockerDebugConfiguration): string {
        return configuration.dockerOptions && configuration.dockerOptions.build && configuration.dockerOptions.build.context
            ? configuration.dockerOptions.build.context
            : path.normalize(resolvedAppFolder) === path.normalize(folder.uri.fsPath)
                ? resolvedAppFolder                 // The context defaults to the application folder if it's the same as the workspace folder (i.e. there's no solution folder).
                : path.dirname(resolvedAppFolder);  // The context defaults to the application's parent (i.e. solution) folder.
    }

    private createLaunchBrowserConfiguration(result: LaunchResult) {
        return result.browserUrl
        ? {
            enabled: true,
            args: result.browserUrl,
            windows: {
                command: 'cmd.exe',
                args: `/C start ${result.browserUrl}`
            },
            osx: {
                command: 'open'
            },
            linux: {
                command: 'xdg-open'
            }
        }
        : {
            enabled: false
        };
    }

    private createConfiguration(debugConfiguration: DockerDebugConfiguration, appFolder: string, result: LaunchResult) {
        const launchBrowser = this.createLaunchBrowserConfiguration(result);

        const dockerDebugConfiguration: DebugConfiguration = {
            name: debugConfiguration.name,
            type: 'coreclr',
            request: 'launch',
            program: result.program,
            args: result.programArgs.join(' '),
            cwd: result.programCwd,
            launchBrowser,
            pipeTransport: {
                pipeCwd: result.pipeCwd,
                pipeProgram: result.pipeProgram,
                pipeArgs: result.pipeArgs,
                debuggerPath: result.debuggerPath,
                quoteArgs: false
            },
            preLaunchTask: debugConfiguration.preLaunchTask,
            sourceFileMap: {
                '/app/Views': path.join(appFolder, 'Views')
            }
        };

        return dockerDebugConfiguration;
    }
}

export default DockerDebugConfigurationProvider;
