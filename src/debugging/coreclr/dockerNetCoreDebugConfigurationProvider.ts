/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { CancellationToken, commands, DebugConfiguration, DebugConfigurationProvider, MessageItem, ProviderResult, window, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { OSProvider } from '../../utils/LocalOSProvider';
import { PlatformOS } from '../../utils/platform';
import { resolveVariables } from '../../utils/resolveVariables';
import { DockerContainerExtraHost, DockerContainerPort, DockerContainerVolume } from './CliDockerClient';
import { UserSecretsRegex } from './CommandLineDotNetClient';
import { DebugSessionManager } from './debugSessionManager';
import { DockerManager, LaunchBuildOptions, LaunchResult, LaunchRunOptions } from './dockerManager';
import { FileSystemProvider } from './fsProvider';
import { NetCoreProjectProvider } from './netCoreProjectProvider';
import { Prerequisite } from './prereqManager';

interface DockerDebugBuildOptions {
    args?: { [key: string]: string };
    context?: string;
    dockerfile?: string;
    labels?: { [key: string]: string };
    tag?: string;
    target?: string;
}

interface DockerDebugRunOptions {
    containerName?: string;
    env?: { [key: string]: string };
    envFiles?: string[];
    extraHosts?: DockerContainerExtraHost[];
    labels?: { [key: string]: string };
    network?: string;
    networkAlias?: string;
    os?: PlatformOS;
    ports?: DockerContainerPort[];
    volumes?: DockerContainerVolume[];
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
    configureAspNetCoreSsl?: boolean;
}

export class DockerNetCoreDebugConfigurationProvider implements DebugConfigurationProvider {
    private static readonly defaultLabels: { [key: string]: string } = { 'com.microsoft.created-by': 'visual-studio-code' };

    private deprecationWarningShown: boolean = false;

    public constructor(
        private readonly debugSessionManager: DebugSessionManager,
        private readonly dockerManager: DockerManager,
        private readonly fsProvider: FileSystemProvider,
        private readonly osProvider: OSProvider,
        private readonly netCoreProjectProvider: NetCoreProjectProvider,
        private readonly prerequisite: Prerequisite) {
    }

    public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        const add: MessageItem = { title: 'Add Docker Files' };

        // Prompt them to add Docker files since they probably haven't
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        window.showErrorMessage(
            localize('vscode-docker.debug.coreclr.addDockerFiles', 'To debug in a Docker container on supported platforms, use the command \'Docker: Add Docker Files to Workspace\', or click \'Add Docker Files\'.'),
            ...[add])
            .then((result) => {
                if (result === add) {
                    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                    commands.executeCommand('vscode-docker.configure');
                }
            });

        return [];
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration | undefined> {
        return callWithTelemetryAndErrorHandling(
            'debugCoreClr',
            async () => await this.resolveDockerDebugConfiguration(folder, debugConfiguration));
    }

    private async resolveDockerDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration): Promise<DebugConfiguration | undefined> {
        if (!folder) {
            throw new Error(localize('vscode-docker.debug.coreclr.noWorkspaceFolder', 'No workspace folder is associated with debugging.'));
        }

        if (debugConfiguration.type === undefined) {
            // If type is undefined, they may be doing F5 without creating any real launch.json, which won't work
            // VSCode subsequently will call provideDebugConfigurations which will show an error message
            return null;
        }

        this.deprecationWarning();

        const { appFolder, resolvedAppFolder } = await this.inferAppFolder(folder, debugConfiguration);

        const { resolvedAppProject } = await this.inferAppProject(folder, debugConfiguration, resolvedAppFolder);

        const appName = path.parse(resolvedAppProject).name;

        const os = debugConfiguration && debugConfiguration.dockerRun && debugConfiguration.dockerRun.os
            ? debugConfiguration.dockerRun.os
            : 'Linux';

        const appOutput = await this.inferAppOutput(debugConfiguration, os, resolvedAppProject);
        const ssl = await this.inferSsl(debugConfiguration, resolvedAppProject);
        const userSecrets = await this.inferUserSecrets(ssl, resolvedAppProject);

        const buildOptions = await this.inferBuildOptions(folder, debugConfiguration, appFolder, resolvedAppFolder, appName);
        const runOptions = DockerNetCoreDebugConfigurationProvider.inferRunOptions(folder, debugConfiguration, appName, os, ssl, userSecrets);

        const launchOptions = {
            appFolder: resolvedAppFolder,
            appOutput: appOutput,
            appProject: resolvedAppProject,
            build: buildOptions,
            run: runOptions
        };

        const prerequisiteSatisfied = await this.prerequisite.checkPrerequisite(launchOptions);

        if (!prerequisiteSatisfied) {
            return undefined;
        }

        const result = await this.dockerManager.prepareForLaunch(launchOptions);

        const configuration = this.createConfiguration(debugConfiguration, appFolder, result);

        this.debugSessionManager.startListening();

        return configuration;
    }

    private async inferBuildOptions(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, appFolder: string, resolvedAppFolder: string, appName: string): Promise<LaunchBuildOptions> {
        const resolvedContext = await this.inferContext(folder, resolvedAppFolder, debugConfiguration);

        const dockerfile = await this.inferDockerfile(folder, resolvedAppFolder, debugConfiguration);

        const args = debugConfiguration && debugConfiguration.dockerBuild && debugConfiguration.dockerBuild.args;

        const labels = (debugConfiguration && debugConfiguration.dockerBuild && debugConfiguration.dockerBuild.labels)
            || DockerNetCoreDebugConfigurationProvider.defaultLabels;

        const tag = debugConfiguration && debugConfiguration.dockerBuild && debugConfiguration.dockerBuild.tag
            ? debugConfiguration.dockerBuild.tag
            : `${appName.toLowerCase()}:dev`;

        const target = debugConfiguration && debugConfiguration.dockerBuild && debugConfiguration.dockerBuild.target
            ? debugConfiguration.dockerBuild.target
            : 'base'; // CONSIDER: Omit target if not specified, or possibly infer from Dockerfile.

        return {
            args,
            context: resolvedContext,
            dockerfile,
            labels,
            tag,
            target
        };
    }

    private static inferRunOptions(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, appName: string, os: PlatformOS, ssl: boolean, userSecrets: boolean): LaunchRunOptions {
        debugConfiguration.dockerRun = debugConfiguration.dockerRun || {};

        const envFiles = debugConfiguration.dockerRun.envFiles
            ? debugConfiguration.dockerRun.envFiles.map(file => resolveVariables(file, folder))
            : undefined;

        if (ssl || userSecrets) {
            debugConfiguration.dockerRun.env = debugConfiguration.dockerRun.env || {};
            debugConfiguration.dockerRun.env.ASPNETCORE_ENVIRONMENT = debugConfiguration.dockerRun.env.ASPNETCORE_ENVIRONMENT || 'Development';

            if (ssl) {
                // tslint:disable-next-line:no-http-string
                debugConfiguration.dockerRun.env.ASPNETCORE_URLS = debugConfiguration.dockerRun.env.ASPNETCORE_URLS || 'http://+:80;https://+:443';
            }
        }

        return {
            containerName: debugConfiguration.dockerRun.containerName || `${appName}-dev`,
            env: debugConfiguration.dockerRun.env,
            envFiles,
            extraHosts: debugConfiguration.dockerRun.extraHosts,
            labels: debugConfiguration.dockerRun.labels || DockerNetCoreDebugConfigurationProvider.defaultLabels,
            network: debugConfiguration.dockerRun.network,
            networkAlias: debugConfiguration.dockerRun.networkAlias,
            os,
            ports: debugConfiguration.dockerRun.ports,
            volumes: DockerNetCoreDebugConfigurationProvider.inferVolumes(folder, debugConfiguration),
            configureAspNetCoreSsl: ssl,
            configureDotNetUserSecrets: userSecrets,
        };
    }

    private static inferVolumes(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration): DockerContainerVolume[] {
        return debugConfiguration && debugConfiguration.dockerRun && debugConfiguration.dockerRun.volumes
            ? debugConfiguration.dockerRun.volumes.map(volume => ({ ...volume, localPath: resolveVariables(volume.localPath, folder) }))
            : [];
    }

    private async inferAppFolder(folder: WorkspaceFolder, configuration: DockerDebugConfiguration): Promise<{ appFolder: string, resolvedAppFolder: string }> {
        let appFolder: string;

        if (configuration) {
            if (configuration.appFolder) {
                appFolder = configuration.appFolder;
            } else if (configuration.appProject) {
                appFolder = path.dirname(configuration.appProject);
            }
        }

        if (appFolder === undefined) {
            appFolder = folder.uri.fsPath;
        }

        const folders = {
            appFolder,
            resolvedAppFolder: resolveVariables(appFolder, folder)
        };

        if (!await this.fsProvider.dirExists(folders.resolvedAppFolder)) {
            throw new Error(localize('vscode-docker.debug.coreclr.noAppFolder', 'The application folder \'{0}\' does not exist. Ensure that the \'appFolder\' or \'appProject\' property is set correctly in the Docker debug configuration.', folders.resolvedAppFolder));
        }

        return folders;
    }

    private async inferAppOutput(configuration: DockerDebugConfiguration, targetOS: PlatformOS, resolvedAppProject: string): Promise<string> {
        if (configuration && configuration.appOutput) {
            return configuration.appOutput;
        }

        const targetPath = await this.netCoreProjectProvider.getTargetPath(resolvedAppProject);
        const relativeTargetPath = this.osProvider.pathNormalize(targetOS, path.relative(path.dirname(resolvedAppProject), targetPath));

        return relativeTargetPath;
    }

    private async inferAppProject(folder: WorkspaceFolder, configuration: DockerDebugConfiguration, resolvedAppFolder: string): Promise<{ appProject: string, resolvedAppProject: string }> {
        let appProject: string;

        if (configuration && configuration.appProject) {
            appProject = configuration.appProject;
        }

        if (appProject === undefined) {
            const files = await this.fsProvider.readDir(resolvedAppFolder);

            const projectFile = files.find(file => ['.csproj', '.fsproj'].includes(path.extname(file)));

            if (projectFile) {
                appProject = path.join(resolvedAppFolder, projectFile);
            }
        }

        if (appProject === undefined) {
            throw new Error(localize('vscode-docker.debug.coreclr.noProjectFile', 'Unable to infer the application project file. Set either the \'appFolder\' or \'appProject\' property in the Docker debug configuration.'));
        }

        const projects = {
            appProject,
            resolvedAppProject: resolveVariables(appProject, folder)
        };

        if (!await this.fsProvider.fileExists(projects.resolvedAppProject)) {
            throw new Error(localize('vscode-docker.debug.coreclr.projectFileNotExist', 'The application project file \'{0}\' does not exist. Ensure that the \'appFolder\' or \'appProject\' property is set correctly in the Docker debug configuration.', projects.resolvedAppProject));
        }

        return projects;
    }

    private async inferContext(folder: WorkspaceFolder, resolvedAppFolder: string, configuration: DockerDebugConfiguration): Promise<string> {
        const context = configuration && configuration.dockerBuild && configuration.dockerBuild.context
            ? configuration.dockerBuild.context
            : path.normalize(resolvedAppFolder) === path.normalize(folder.uri.fsPath)
                ? resolvedAppFolder                 // The context defaults to the application folder if it's the same as the workspace folder (i.e. there's no solution folder).
                : path.dirname(resolvedAppFolder);  // The context defaults to the application's parent (i.e. solution) folder.

        const resolvedContext = resolveVariables(context, folder);

        if (!await this.fsProvider.dirExists(resolvedContext)) {
            throw new Error(localize('vscode-docker.debug.coreclr.contextFolderNotExist', 'The context folder \'{0}\' does not exist. Ensure that the \'context\' property is set correctly in the Docker debug configuration.', resolvedContext));
        }

        return resolvedContext;
    }

    private async inferDockerfile(folder: WorkspaceFolder, resolvedAppFolder: string, configuration: DockerDebugConfiguration): Promise<string> {
        let dockerfile = configuration && configuration.dockerBuild && configuration.dockerBuild.dockerfile
            ? configuration.dockerBuild.dockerfile
            : path.join(resolvedAppFolder, 'Dockerfile'); // CONSIDER: Omit dockerfile argument if not specified or possibly infer from context.

        dockerfile = resolveVariables(dockerfile, folder);

        if (!await this.fsProvider.fileExists(dockerfile)) {
            throw new Error(localize('vscode-docker.debug.coreclr.dockerfileNotExist', 'The Dockerfile \'{0}\' does not exist. Ensure that the \'dockerfile\' property is set correctly in the Docker debug configuration.', dockerfile));
        }

        return dockerfile;
    }

    private async inferSsl(debugConfiguration: DockerDebugConfiguration, projectFile: string): Promise<boolean> {
        if (debugConfiguration.configureAspNetCoreSsl !== undefined) {
            return debugConfiguration.configureAspNetCoreSsl;
        }

        try {
            const launchSettingsPath = path.join(path.dirname(projectFile), 'Properties', 'launchSettings.json');

            if (await this.fsProvider.fileExists(launchSettingsPath)) {
                const launchSettings = await fse.readJson(launchSettingsPath);

                // tslint:disable:no-unsafe-any no-any
                if (launchSettings && launchSettings.profiles) {
                    // launchSettings.profiles is a dictionary instead of an array, so need to get the values and look for one that has commandName: 'Project'
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    const projectProfile = Object.values<any>(launchSettings.profiles).find(p => p.commandName === 'Project');

                    if (projectProfile && projectProfile.applicationUrl && /https:\/\//i.test(projectProfile.applicationUrl)) {
                        return true;
                    }
                }
                // tslint:enable:no-unsafe-any no-any
            }
        } catch { }

        return false;
    }

    private async inferUserSecrets(ssl: boolean, projectFile: string): Promise<boolean> {
        if (ssl) {
            return true;
        }

        if (await this.fsProvider.fileExists(projectFile)) {
            const contents = await this.fsProvider.readFile(projectFile);
            return UserSecretsRegex.test(contents);
        }
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
            env: result.programEnv,
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

    private deprecationWarning(): void {
        if (this.deprecationWarningShown) {
            return;
        }
        this.deprecationWarningShown = true;

        const deprecationMessage = localize('vscode-docker.debug.coreclr.deprecationWarning', 'The `docker-coreclr` debug type has been deprecated. Do you want to upgrade your launch configuration?');
        const upgrade: MessageItem = {
            title: localize('vscode-docker.debug.coreclr.upgrade', 'Upgrade'),
        };

        // Don't wait
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        ext.ui.showWarningMessage(deprecationMessage, upgrade).then(response => {
            if (response === upgrade) {
                // Don't wait
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                commands.executeCommand('vscode-docker.debugging.initializeForDebugging');
            }
        });
    }
}

export default DockerNetCoreDebugConfigurationProvider;
