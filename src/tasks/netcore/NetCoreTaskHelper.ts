/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { WorkspaceFolder } from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { getContainerSecretsFolders, getHostSecretsFolders } from '../../debugging/netcore/AspNetSslHelper';
import { NetCoreDebugOptions } from '../../debugging/netcore/NetCoreDebugHelper';
import { vsDbgInstallBasePath } from '../../debugging/netcore/VsDbgHelper';
import { localize } from '../../localize';
import { isMac, isWindows } from '../../utils/osUtils';
import { PlatformOS } from '../../utils/platform';
import { quickPickProjectFileItem } from '../../utils/quickPickFile';
import { resolveVariables, unresolveWorkspaceFolder } from '../../utils/resolveVariables';
import { DockerBuildOptions, DockerBuildTaskDefinitionBase } from '../DockerBuildTaskDefinitionBase';
import { DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerContainerVolume, DockerRunOptions, DockerRunTaskDefinitionBase } from '../DockerRunTaskDefinitionBase';
import { DockerRunTaskDefinition } from '../DockerRunTaskProvider';
import { addVolumeWithoutConflicts, DockerBuildTaskContext, DockerRunTaskContext, DockerTaskScaffoldContext, getDefaultContainerName, getDefaultImageName, inferImageName, TaskHelper } from '../TaskHelper';
import { updateBlazorManifest } from './updateBlazorManifest';

export interface NetCoreTaskOptions {
    appProject?: string;
    configureSsl?: boolean;
    enableDebugging?: boolean;
}

export interface NetCoreBuildTaskDefinition extends DockerBuildTaskDefinitionBase {
    netCore?: NetCoreTaskOptions;
}

export interface NetCoreRunTaskDefinition extends DockerRunTaskDefinitionBase {
    netCore?: NetCoreTaskOptions;
}

export interface NetCoreTaskScaffoldingOptions {
    appProject?: string;
    platformOS?: PlatformOS;
}

interface LaunchProfile {
    applicationUrl?: string;
    commandName?: string;
}

interface LaunchSettings {
    profiles?: { [key: string]: LaunchProfile };
}

const UserSecretsRegex = /UserSecretsId/i;
const MacNuGetPackageFallbackFolderPath = '/usr/local/share/dotnet/sdk/NuGetFallbackFolder';
const LinuxNuGetPackageFallbackFolderPath = '/usr/share/dotnet/sdk/NuGetFallbackFolder';

export class NetCoreTaskHelper implements TaskHelper {
    public async provideDockerBuildTasks(context: DockerTaskScaffoldContext, options?: NetCoreTaskScaffoldingOptions): Promise<DockerBuildTaskDefinition[]> {
        options = options || {};
        options.appProject = options.appProject || await NetCoreTaskHelper.inferAppProject(context.folder); // This method internally checks the user-defined input first

        return [
            {
                type: 'docker-build',
                label: 'docker-build: debug',
                dependsOn: ['build'],
                dockerBuild: {
                    tag: getDefaultImageName(context.folder.name, 'dev'),
                    target: 'base',
                    dockerfile: unresolveWorkspaceFolder(context.dockerfile, context.folder),
                    /* eslint-disable-next-line no-template-curly-in-string */
                    context: '${workspaceFolder}',
                    pull: true
                },
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder)
                }
            },
            {
                type: 'docker-build',
                label: 'docker-build: release',
                dependsOn: ['build'],
                dockerBuild: {
                    tag: getDefaultImageName(context.folder.name, 'latest'), // The 'latest' here is redundant but added to differentiate from above's 'dev'
                    dockerfile: unresolveWorkspaceFolder(context.dockerfile, context.folder),
                    /* eslint-disable-next-line no-template-curly-in-string */
                    context: '${workspaceFolder}',
                    pull: true
                },
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder)
                }
            }
        ];
    }

    public async provideDockerRunTasks(context: DockerTaskScaffoldContext, options?: NetCoreTaskScaffoldingOptions): Promise<DockerRunTaskDefinition[]> {
        options = options || {};
        options.appProject = options.appProject || await NetCoreTaskHelper.inferAppProject(context.folder); // This method internally checks the user-defined input first
        options.platformOS = options.platformOS || 'Linux';

        // If there's exactly one port and it's 80, then set configureSsl to false, otherwise leave it undefined
        const configureSsl: false | undefined = context.ports?.length === 1 && context.ports?.[0] === 80 ? false : undefined;

        return [
            {
                type: 'docker-run',
                label: 'docker-run: debug',
                dependsOn: ['docker-build: debug'],
                dockerRun: {
                    os: options.platformOS === 'Windows' ? 'Windows' : undefined, // Default is Linux so we'll leave it undefined for brevity
                },
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder),
                    enableDebugging: true,
                    configureSsl: configureSsl,
                }
            },
            {
                type: 'docker-run',
                label: 'docker-run: release',
                dependsOn: ['docker-build: release'],
                dockerRun: {
                    os: options.platformOS === 'Windows' ? 'Windows' : undefined, // Default is Linux so we'll leave it undefined for brevity
                },
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder)
                }
            }
        ];
    }

    public async getDockerBuildOptions(context: DockerBuildTaskContext, buildDefinition: NetCoreBuildTaskDefinition): Promise<DockerBuildOptions> {
        const buildOptions = buildDefinition.dockerBuild;

        /* eslint-disable no-template-curly-in-string */
        buildOptions.context = buildOptions.context || '${workspaceFolder}';
        buildOptions.dockerfile = buildOptions.dockerfile || path.join('${workspaceFolder}', 'Dockerfile');
        /* eslint-enable no-template-curly-in-string */
        buildOptions.tag = buildOptions.tag || getDefaultImageName(context.folder.name);

        return buildOptions;
    }

    public async getDockerRunOptions(context: DockerRunTaskContext, runDefinition: NetCoreRunTaskDefinition): Promise<DockerRunOptions> {
        const runOptions = runDefinition.dockerRun;
        const helperOptions = runDefinition.netCore || {};

        helperOptions.appProject = await NetCoreTaskHelper.inferAppProject(context.folder, helperOptions); // This method internally checks the user-defined input first

        runOptions.containerName = runOptions.containerName || getDefaultContainerName(context.folder.name);
        runOptions.os = runOptions.os || 'Linux';
        runOptions.image = inferImageName(runDefinition as DockerRunTaskDefinition, context, context.folder.name, 'dev');

        const ssl = helperOptions.configureSsl !== undefined ? helperOptions.configureSsl : await NetCoreTaskHelper.inferSsl(context.folder, helperOptions);
        const userSecrets = ssl === true ? true : await this.inferUserSecrets(helperOptions);

        runOptions.env = runOptions.env || {};
        runOptions.env.DOTNET_USE_POLLING_FILE_WATCHER = runOptions.env.DOTNET_USE_POLLING_FILE_WATCHER || '1';

        if (userSecrets) {
            runOptions.env.ASPNETCORE_ENVIRONMENT = runOptions.env.ASPNETCORE_ENVIRONMENT || 'Development';

            if (ssl) {
                // tslint:disable-next-line: no-http-string
                runOptions.env.ASPNETCORE_URLS = runOptions.env.ASPNETCORE_URLS || 'https://+:443;http://+:80';
            }
        }

        runOptions.volumes = await this.inferVolumes(context.folder, runOptions, helperOptions, ssl, userSecrets); // Volumes specifically are unioned with the user input (their input does not override except where the container path is the same)

        return runOptions;
    }

    public async postRun(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<void> {
        try {
            if (runDefinition.netCore.enableDebugging &&
                await NetCoreTaskHelper.isWebApp(runDefinition.netCore.appProject)) {
                await updateBlazorManifest(context, runDefinition);
            }
        } catch (err) {
            context.terminal.writeWarningLine(localize('vscode-docker.tasks.netCore.failedBlazorUpdate', 'Failed to update Blazor static web assets manifest. Static web assets may not work.\nThe error was: {0}', parseError(err).message));
        }
    }

    public static async inferAppProject(folder: WorkspaceFolder, helperOptions?: NetCoreTaskOptions | NetCoreDebugOptions): Promise<string> {
        let result: string;

        if (helperOptions && helperOptions.appProject) {
            result = resolveVariables(helperOptions.appProject, folder);
        } else {
            // Find a .csproj or .fsproj in the folder
            const item = await quickPickProjectFileItem(undefined, folder, localize('vscode-docker.tasks.netCore.noCsproj', 'No .NET Core project file (.csproj or .fsproj) could be found.'));
            result = item.absoluteFilePath;
        }

        return result;
    }

    public static async inferSsl(folder: WorkspaceFolder, helperOptions: NetCoreTaskOptions): Promise<boolean> {
        try {
            const launchSettingsPath = path.join(path.dirname(helperOptions.appProject), 'Properties', 'launchSettings.json');

            if (await fse.pathExists(launchSettingsPath)) {
                const launchSettings = <LaunchSettings>await fse.readJson(launchSettingsPath);

                if (launchSettings && launchSettings.profiles) {
                    // launchSettings.profiles is a dictionary instead of an array, so need to get the values and look for one that has commandName: 'Project'
                    const projectProfile = Object.values(launchSettings.profiles).find(p => p.commandName === 'Project');

                    if (projectProfile && projectProfile.applicationUrl && /https:\/\//i.test(projectProfile.applicationUrl)) {
                        return true;
                    }
                }
            }
        } catch { }

        return false;
    }

    public static async isWebApp(appProject: string): Promise<boolean> {
        const projectContents = await fse.readFile(appProject);

        return /Sdk\s*=\s*\"Microsoft\.NET\.Sdk\.Web\"/ig.test(projectContents.toString());
    }

    private async inferUserSecrets(helperOptions: NetCoreTaskOptions): Promise<boolean> {
        const contents = await fse.readFile(helperOptions.appProject);
        return UserSecretsRegex.test(contents.toString());
    }

    private async inferVolumes(folder: WorkspaceFolder, runOptions: DockerRunOptions, helperOptions: NetCoreTaskOptions, ssl: boolean, userSecrets: boolean): Promise<DockerContainerVolume[]> {
        const volumes: DockerContainerVolume[] = [];

        if (runOptions.volumes) {
            for (const volume of runOptions.volumes) {
                addVolumeWithoutConflicts(volumes, volume);
            }
        }

        if (helperOptions.enableDebugging) {
            const appVolume: DockerContainerVolume = {
                localPath: path.dirname(helperOptions.appProject),
                containerPath: runOptions.os === 'Windows' ? 'C:\\app' : '/app',
                permissions: 'rw'
            };

            const srcVolume: DockerContainerVolume = {
                localPath: folder.uri.fsPath,
                containerPath: runOptions.os === 'Windows' ? 'C:\\src' : '/src',
                permissions: 'rw'
            }

            const debuggerVolume: DockerContainerVolume = {
                localPath: vsDbgInstallBasePath,
                containerPath: runOptions.os === 'Windows' ? 'C:\\remote_debugger' : '/remote_debugger',
                permissions: 'ro'
            };

            const nugetVolume: DockerContainerVolume = {
                localPath: path.join(os.homedir(), '.nuget', 'packages'),
                containerPath: runOptions.os === 'Windows' ? 'C:\\.nuget\\packages' : '/root/.nuget/packages',
                permissions: 'ro'
            };

            let programFilesEnvironmentVariable: string | undefined;

            if (isWindows()) {
                programFilesEnvironmentVariable = process.env.ProgramFiles;

                if (programFilesEnvironmentVariable === undefined) {
                    throw new Error(localize('vscode-docker.tasks.netCore.programFilesUndefined', 'The environment variable \'ProgramFiles\' is not defined. This variable is used to locate the NuGet fallback folder.'));
                }
            }

            const nugetFallbackVolume: DockerContainerVolume = {
                localPath: isWindows() ? path.join(programFilesEnvironmentVariable, 'dotnet', 'sdk', 'NuGetFallbackFolder') :
                    (isMac() ? MacNuGetPackageFallbackFolderPath : LinuxNuGetPackageFallbackFolderPath),
                containerPath: runOptions.os === 'Windows' ? 'C:\\.nuget\\fallbackpackages' : '/root/.nuget/fallbackpackages',
                permissions: 'ro'
            };

            addVolumeWithoutConflicts(volumes, appVolume);
            addVolumeWithoutConflicts(volumes, srcVolume);
            addVolumeWithoutConflicts(volumes, debuggerVolume);
            addVolumeWithoutConflicts(volumes, nugetVolume);
            if (await fse.pathExists(nugetFallbackVolume.localPath)) {
                addVolumeWithoutConflicts(volumes, nugetFallbackVolume);
            }
        }

        if (userSecrets || ssl) {
            const hostSecretsFolders = getHostSecretsFolders();
            const containerSecretsFolders = getContainerSecretsFolders(runOptions.os);

            const userSecretsVolume: DockerContainerVolume = {
                localPath: hostSecretsFolders.hostUserSecretsFolder,
                containerPath: containerSecretsFolders.containerUserSecretsFolder,
                permissions: 'ro'
            };

            addVolumeWithoutConflicts(volumes, userSecretsVolume);

            if (ssl) {
                const certVolume: DockerContainerVolume = {
                    localPath: hostSecretsFolders.hostCertificateFolder,
                    containerPath: containerSecretsFolders.containerCertificateFolder,
                    permissions: 'ro'
                };

                addVolumeWithoutConflicts(volumes, certVolume);
            }
        }

        return volumes;
    }
}

export const netCoreTaskHelper = new NetCoreTaskHelper();
