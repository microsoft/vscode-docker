/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { CancellationToken, DebugConfiguration, DebugConfigurationProvider, ProviderResult, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { PlatformOS } from '../../utils/platform';
import { DebugSessionManager } from './debugSessionManager';
import { DockerManager, LaunchResult } from './dockerManager';
import { FileSystemProvider } from './fsProvider';
import { NetCoreProjectProvider } from './netCoreProjectProvider';
import { OSProvider } from './osProvider';
import { Prerequisite } from './prereqManager';

interface DockerDebugBuildOptions {
    context?: string;
    dockerfile?: string;
    labels?: { [key: string]: string };
    tag?: string;
    target?: string;
}

interface DockerDebugRunOptions {
    containerName?: string;
    os?: PlatformOS;
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
    appFolder?: string;
    appOutput?: string;
    appProject?: string;
    dockerBuild?: DockerDebugBuildOptions;
    dockerRun?: DockerDebugRunOptions;
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
                name: 'Docker: Launch .NET Core ASP.NET (Preview)',
                type: 'docker-coreclr',
                request: 'launch',
                preLaunchTask: 'build',
                dockerBuild: {
                },
                dockerRun: {
                }
            }
        ];
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration | undefined> {
        return callWithTelemetryAndErrorHandling(
            'debugCoreClr',
            async () => await this.resolveDockerDebugConfiguration(folder, debugConfiguration));
    }

    private static resolveFolderPath(folderPath: string, folder: WorkspaceFolder): string {
        return folderPath.replace(/\$\{workspaceFolder\}/gi, folder.uri.fsPath);
    }

    private async resolveDockerDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration): Promise<DebugConfiguration | undefined> {
        if (!folder) {
            throw new Error('No workspace folder is associated with debugging.');
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

        let dockerfile = debugConfiguration && debugConfiguration.dockerBuild && debugConfiguration.dockerBuild.dockerfile
            ? DockerDebugConfigurationProvider.resolveFolderPath(debugConfiguration.dockerBuild.dockerfile, folder)
            : path.join(appFolder, 'Dockerfile'); // CONSIDER: Omit dockerfile argument if not specified or possibly infer from context.

        dockerfile = DockerDebugConfigurationProvider.resolveFolderPath(dockerfile, folder);

        const target = debugConfiguration && debugConfiguration.dockerBuild && debugConfiguration.dockerBuild.target
            ? debugConfiguration.dockerBuild.target
            : 'base'; // CONSIDER: Omit target if not specified, or possibly infer from Dockerfile.

        const appName = path.basename(resolvedAppProject, '.csproj');

        const tag = debugConfiguration && debugConfiguration.dockerBuild && debugConfiguration.dockerBuild.tag
            ? debugConfiguration.dockerBuild.tag
            : `${appName.toLowerCase()}:dev`;

        const containerName = debugConfiguration && debugConfiguration.dockerRun && debugConfiguration.dockerRun.containerName
            ? debugConfiguration.dockerRun.containerName
            : `${appName}-dev`; // CONSIDER: Use unique ID instead?

        const os = debugConfiguration && debugConfiguration.dockerRun && debugConfiguration.dockerRun.os
            ? debugConfiguration.dockerRun.os
            : 'Linux';

        const appOutput = await this.inferAppOutput(debugConfiguration, os, resolvedAppProject);

        const labels = (debugConfiguration && debugConfiguration.dockerBuild && debugConfiguration.dockerBuild.labels)
            || { 'com.microsoft.created-by': 'visual-studio-code' };

        const result = await this.dockerManager.prepareForLaunch({
            appFolder: resolvedAppFolder,
            appOutput,
            build: {
                context: resolvedContext,
                dockerfile,
                labels,
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
        if (configuration) {
            if (configuration.appFolder) {
                return configuration.appFolder;
            }

            if (configuration.appProject) {
                return path.dirname(configuration.appProject);
            }
        }

        return folder.uri.fsPath;
    }

    private async inferAppOutput(configuration: DockerDebugConfiguration, targetOS: PlatformOS, resolvedAppProject: string): Promise<string> {
        if (configuration && configuration.appOutput) {
            return configuration.appOutput;
        }

        const targetPath = await this.netCoreProjectProvider.getTargetPath(resolvedAppProject);
        const relativeTargetPath = this.osProvider.pathNormalize(targetOS, path.relative(path.dirname(resolvedAppProject), targetPath));

        return relativeTargetPath;
    }

    private async inferAppProject(configuration: DockerDebugConfiguration, resolvedAppFolder: string): Promise<string> {
        if (configuration) {
            if (configuration.appProject) {
                return configuration.appProject;
            }
        }

        const files = await this.fsProvider.readDir(resolvedAppFolder);

        const projectFile = files.find(file => path.extname(file) === '.csproj');

        if (projectFile) {
            return path.join(resolvedAppFolder, projectFile);
        }

        throw new Error('Unable to infer the application project file. Set either the `appFolder` or `appProject` property in the Docker debug configuration.');
    }

    private inferContext(folder: WorkspaceFolder, resolvedAppFolder: string, configuration: DockerDebugConfiguration): string {
        return configuration && configuration.dockerBuild && configuration.dockerBuild.context
            ? configuration.dockerBuild.context
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
