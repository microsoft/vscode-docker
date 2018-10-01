/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { CancellationToken, DebugConfiguration, DebugConfigurationProvider, ProviderResult, WorkspaceFolder } from 'vscode';
import { DebugSessionManager } from './debugSessionManager';
import { DockerManager, LaunchResult } from './dockerManager';
import { FileSystemProvider } from './fsProvider';
import { NetCoreProjectProvider } from './netCoreProjectProvider';
import { OSProvider, PlatformType  } from './osProvider';
import { Prerequisite } from './prereqManager';

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
    appProject?: string;
    build?: DockerDebugBuildOptions;
    run?: DockerDebugRunOptions;
}

interface DebugConfigurationBrowserBaseOptions {
    enabled?: boolean;
    command?: string;
    args?: string;
}

interface DebugConfigurationBrowserOptions extends DebugConfigurationBrowserBaseOptions {
    windows?: DebugConfigurationBrowserBaseOptions;
    osx?: DebugConfigurationBrowserBaseOptions;
    linux?: DebugConfigurationBrowserBaseOptions;
}

interface DockerDebugConfiguration extends DebugConfiguration {
    dockerOptions?: DockerDebugOptions;
}

export class DockerDebugConfigurationProvider implements DebugConfigurationProvider {
    constructor(
        private readonly debugSessionManager: DebugSessionManager,
        private readonly dockerManager: DockerManager,
        private readonly fsProvider: FileSystemProvider,
        private readonly osProvider: OSProvider,
        private readonly netCoreProjectProvider: NetCoreProjectProvider,
        private readonly prerequisite: Prerequisite) {
    }

    public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        return [
            {
                name: 'Docker: Launch .NET Core',
                type: 'docker-netcoreapp',
                request: 'launch',
                preLaunchTask: 'build'
            }
        ];
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        return this.resolveDockerDebugConfiguration(folder, debugConfiguration);
    }

    private static resolveFolderPath(folderPath: string, folder: WorkspaceFolder): string {
        return folderPath.replace(/\$\{workspaceFolder\}/g, folder.uri.fsPath);
    }

    private async resolveDockerDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration): Promise<DebugConfiguration> {
        if (!folder) {
            return undefined;
        }

        const prerequisiteSatisfied = await this.prerequisite.checkPrerequisite();

        if (!prerequisiteSatisfied) {
            return undefined;
        }

        const appFolder = this.inferAppFolder(folder, debugConfiguration);

        const resolvedAppFolder = DockerDebugConfigurationProvider.resolveFolderPath(appFolder, folder);

        const appProject = await this.inferAppProject(debugConfiguration, resolvedAppFolder);

        const resolvedAppProject = DockerDebugConfigurationProvider.resolveFolderPath(appProject, folder);

        const context = this.inferContext(folder, resolvedAppFolder, debugConfiguration);

        const resolvedContext = DockerDebugConfigurationProvider.resolveFolderPath(context, folder);

        let dockerfile = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.build && debugConfiguration.dockerOptions.build.dockerfile
            ? DockerDebugConfigurationProvider.resolveFolderPath(debugConfiguration.dockerOptions.build.dockerfile, folder)
            : path.join(appFolder, 'Dockerfile'); // TODO: Omit dockerfile argument if not specified or possibly infer from context.

        dockerfile = DockerDebugConfigurationProvider.resolveFolderPath(dockerfile, folder);

        const target = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.build && debugConfiguration.dockerOptions.build.target
            ? debugConfiguration.dockerOptions.build.target
            : 'base'; // TODO: Omit target if not specified, or possibly infer from Dockerfile.

        const appName = path.basename(resolvedAppProject);

        const tag = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.build && debugConfiguration.dockerOptions.build.tag
            ? debugConfiguration.dockerOptions.build.tag
            : `${appName.toLowerCase()}:dev`;

        const containerName = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.run && debugConfiguration.dockerOptions.run.containerName
            ? debugConfiguration.dockerOptions.run.containerName
            : `${appName}-dev`; // TODO: Use unique ID instead?

        const os = debugConfiguration.dockerOptions && debugConfiguration.dockerOptions.run && debugConfiguration.dockerOptions.run.os
            ? debugConfiguration.dockerOptions.run.os
            : 'Linux';

        const appOutput = await this.inferAppOutput(debugConfiguration, os, resolvedAppProject);

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

        const configuration = this.createConfiguration(debugConfiguration, appFolder, result);

        this.debugSessionManager.startListening();

        return configuration;
    }

    private inferAppFolder(folder: WorkspaceFolder, configuration: DockerDebugConfiguration): string {
        if (configuration.dockerOptions) {
            if (configuration.dockerOptions.appFolder) {
                return configuration.dockerOptions.appFolder;
            }

            if (configuration.dockerOptions.appProject) {
                return path.dirname(configuration.dockerOptions.appProject);
            }
        }

        return folder.uri.fsPath;
    }

    private async inferAppOutput(configuration: DockerDebugConfiguration, targetOS: PlatformType, resolvedAppProject: string): Promise<string> {
        if (configuration.dockerOptions && configuration.dockerOptions.appOutput) {
            return configuration.dockerOptions.appOutput;
        }

        const targetPath = await this.netCoreProjectProvider.getTargetPath(resolvedAppProject);
        const relativeTargetPath = this.osProvider.pathNormalize(targetOS, path.relative(path.dirname(resolvedAppProject), targetPath));

        return relativeTargetPath;
    }

    private async inferAppProject(configuration: DockerDebugConfiguration, resolvedAppFolder: string): Promise<string> {
        if (configuration.dockerOptions) {
            if (configuration.dockerOptions.appProject) {
                return configuration.dockerOptions.appProject;
            }
        }

        const files = await this.fsProvider.readDir(resolvedAppFolder);

        const projectFile = files.find(file => path.extname(file) === '.csproj');

        if (projectFile) {
            return path.join(resolvedAppFolder, projectFile);
        }

        throw new Error('Unable to infer the application project file. It must be explicitly set in the Docker debug configuration.');
    }

    private inferContext(folder: WorkspaceFolder, resolvedAppFolder: string, configuration: DockerDebugConfiguration): string {
        return configuration.dockerOptions && configuration.dockerOptions.build && configuration.dockerOptions.build.context
            ? configuration.dockerOptions.build.context
            : path.normalize(resolvedAppFolder) === path.normalize(folder.uri.fsPath)
                ? resolvedAppFolder                 // The context defaults to the application folder if it's the same as the workspace folder (i.e. there's no solution folder).
                : path.dirname(resolvedAppFolder);  // The context defaults to the application's parent (i.e. solution) folder.
    }

    private createLaunchBrowserConfiguration(result: LaunchResult): DebugConfigurationBrowserOptions {
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

    private createConfiguration(debugConfiguration: DockerDebugConfiguration, appFolder: string, result: LaunchResult): DebugConfiguration {
        const launchBrowser = this.createLaunchBrowserConfiguration(result);

        return {
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
    }
}

export default DockerDebugConfigurationProvider;
