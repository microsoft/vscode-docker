/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { CancellationToken, WorkspaceFolder } from 'vscode';
import { LocalAspNetCoreSslManager } from '../../debugging/coreclr/LocalAspNetCoreSslManager';
import { NetCoreDebugHelper, NetCoreDebugOptions } from '../../debugging/netcore/NetCoreDebugHelper';
import { quickPickProjectFileItem } from '../../utils/quick-pick-file';
import { DockerBuildHelperOptions, DockerBuildOptions, DockerBuildTaskContext, DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerContainerVolume, DockerRunHelperOptions, DockerRunOptions, DockerRunTaskContext, DockerRunTaskDefinition } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NetCoreTaskOptions extends DockerBuildHelperOptions, DockerRunHelperOptions {
    appProject?: string;
    configureSsl?: boolean;
}

const UserSecretsRegex = /UserSecretsId/i;
const MacNuGetPackageFallbackFolderPath = '/usr/local/share/dotnet/sdk/NuGetFallbackFolder';
const LinuxNuGetPackageFallbackFolderPath = '/usr/share/dotnet/sdk/NuGetFallbackFolder';

export class NetCoreTaskHelper implements TaskHelper {
    private static readonly defaultLabels: { [key: string]: string } = { 'com.microsoft.created-by': 'visual-studio-code' };

    public async provideDockerBuildTasks(folder: WorkspaceFolder, options?: NetCoreTaskOptions): Promise<DockerBuildTaskDefinition[]> {
        options.appProject = await NetCoreTaskHelper.inferAppProject(folder, options); // This method internally checks the user-defined input first
        return [
            {
                type: 'docker-build',
                label: 'docker-build',
                dependsOn: ['build'],
                dockerBuild: {},
                platform: 'netCore',
                netCore: {
                    appProject: NetCoreTaskHelper.unresolveWorkspaceFolderPath(folder, options.appProject)
                }
            }
        ];
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder, options?: NetCoreTaskOptions): Promise<DockerRunTaskDefinition[]> {
        options.appProject = await NetCoreTaskHelper.inferAppProject(folder, options); // This method internally checks the user-defined input first
        return [
            {
                type: 'docker-run',
                label: 'docker-run',
                dependsOn: ['docker-build'],
                dockerRun: {},
                platform: 'netCore',
                netCore: {
                    appProject: NetCoreTaskHelper.unresolveWorkspaceFolderPath(folder, options.appProject)
                }
            }
        ];
    }

    public async resolveDockerBuildOptions(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, context: DockerBuildTaskContext, token?: CancellationToken): Promise<DockerBuildOptions> {
        const helperOptions: NetCoreTaskOptions = context.helperOptions || {};
        helperOptions.appProject = await NetCoreTaskHelper.inferAppProject(folder, helperOptions); // This method internally checks the user-defined input first

        const appName = await NetCoreTaskHelper.inferAppName(folder, helperOptions);

        // tslint:disable: no-invalid-template-strings
        buildOptions.context = buildOptions.context || '${workspaceFolder}';
        buildOptions.dockerfile = buildOptions.dockerfile || path.join('${workspaceFolder}', 'Dockerfile');
        // tslint:enable: no-invalid-template-strings
        buildOptions.tag = buildOptions.tag || `${appName}:dev`;
        buildOptions.target = buildOptions.target || 'base';
        buildOptions.labels = buildOptions.labels || NetCoreTaskHelper.defaultLabels;

        return buildOptions;
    }

    public async resolveDockerRunOptions(folder: WorkspaceFolder, runOptions: DockerRunOptions, context: DockerRunTaskContext, token?: CancellationToken): Promise<DockerRunOptions> {
        const helperOptions: NetCoreTaskOptions = context.helperOptions || {};
        helperOptions.appProject = await NetCoreTaskHelper.inferAppProject(folder, helperOptions); // This method internally checks the user-defined input first

        const appName = await NetCoreTaskHelper.inferAppName(folder, helperOptions);

        runOptions.containerName = runOptions.containerName || `${appName}-dev`;
        runOptions.labels = runOptions.labels || NetCoreTaskHelper.defaultLabels;
        runOptions.os = runOptions.os || 'Linux';
        runOptions.image = runOptions.image || await this.inferImage(appName, context);

        runOptions.entrypoint = runOptions.entrypoint || runOptions.os === 'Windows' ? 'ping' : 'tail';
        runOptions.command = runOptions.command || runOptions.os === 'Windows' ? '-t localhost' : '-f /dev/null';

        const ssl = helperOptions.configureSsl !== undefined ? helperOptions.configureSsl : await NetCoreTaskHelper.inferSsl(folder, helperOptions);
        const userSecrets = ssl === true ? true : await this.inferUserSecrets(folder, helperOptions);

        if (userSecrets) {
            runOptions.env = runOptions.env || {};
            runOptions.env.ASPNETCORE_ENVIRONMENT = runOptions.env.ASPNETCORE_ENVIRONMENT || 'Development';

            if (ssl) {
                // tslint:disable-next-line: no-http-string
                runOptions.env.ASPNETCORE_URLS = runOptions.env.ASPNETCORE_URLS || 'https://+:443;http://+:80';
            }
        }

        runOptions.volumes = await this.inferVolumes(folder, runOptions, helperOptions, ssl, userSecrets); // Volumes specifically are unioned with the user input (their input does not override except where the container path is the same)

        return runOptions;
    }

    public static async inferAppName(folder: WorkspaceFolder, helperOptions: NetCoreTaskOptions | NetCoreDebugOptions): Promise<string> {
        // TODO: No more unicode snowman in container name :(
        return path.parse(helperOptions.appProject).name.replace(/\s/i, '').toLowerCase();
    }

    public static async inferAppFolder(folder: WorkspaceFolder, helperOptions: NetCoreTaskOptions | NetCoreDebugOptions): Promise<string> {
        if (helperOptions.appProject) {
            return path.dirname(helperOptions.appProject);
        }

        return folder.uri.fsPath;
    }

    public static async inferAppProject(folder: WorkspaceFolder, helperOptions: NetCoreTaskOptions | NetCoreDebugOptions): Promise<string> {
        let result: string;

        if (helperOptions.appProject) {
            result = NetCoreTaskHelper.resolveWorkspaceFolderPath(folder, helperOptions.appProject);
        } else {
            // Find a .csproj or .fsproj in the folder
            const item = await quickPickProjectFileItem(undefined, folder, 'The \'netCore.appProject\' in the Docker task definition is undefined or does not exist. Ensure that the property is set to the appropriate .NET Core project.');
            result = item.absoluteFilePath;
        }

        return result;
    }

    public static async inferSsl(folder: WorkspaceFolder, helperOptions: NetCoreTaskOptions): Promise<boolean> {
        try {
            const launchSettingsPath = path.join(path.dirname(helperOptions.appProject), 'Properties', 'launchSettings.json');

            if (await fse.pathExists(launchSettingsPath)) {
                const launchSettings = await fse.readJson(launchSettingsPath);

                //tslint:disable:no-unsafe-any no-any
                if (launchSettings && launchSettings.profiles) {
                    // launchSettings.profiles is a dictionary instead of an array, so need to get the values and look for one that has commandName: 'Project'
                    const projectProfile = Object.values<any>(launchSettings.profiles).find(p => p.commandName === 'Project');

                    if (projectProfile && projectProfile.applicationUrl && /https:\/\//i.test(projectProfile.applicationUrl)) {
                        return true;
                    }
                }
                //tslint:enable:no-unsafe-any no-any
            }
        } catch { }

        return false;
    }

    public static resolveWorkspaceFolderPath(folder: WorkspaceFolder, folderPath: string): string {
        return folderPath.replace(/\$\{workspaceFolder\}/gi, folder.uri.fsPath);
    }

    public static unresolveWorkspaceFolderPath(folder: WorkspaceFolder, folderPath: string): string {
        // tslint:disable-next-line: no-invalid-template-strings
        return folderPath.replace(folder.uri.fsPath, '${workspaceFolder}').replace(/\\/g, '/');
    }

    private async inferImage(appName: string, context: DockerRunTaskContext): Promise<string> {
        return context.associatedBuildTask && context.associatedBuildTask.dockerBuild && context.associatedBuildTask.dockerBuild.tag || `${appName}:dev`;
    }

    private async inferUserSecrets(folder: WorkspaceFolder, helperOptions: NetCoreTaskOptions): Promise<boolean> {
        const contents = await fse.readFile(helperOptions.appProject);
        return UserSecretsRegex.test(contents.toString());
    }

    private async inferVolumes(folder: WorkspaceFolder, runOptions: DockerRunOptions, helperOptions: NetCoreTaskOptions, ssl: boolean, userSecrets: boolean): Promise<DockerContainerVolume[]> {
        const volumes: DockerContainerVolume[] = [];

        if (runOptions.volumes) {
            for (const volume of runOptions.volumes) {
                NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, volume);
            }
        }

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
            localPath: NetCoreDebugHelper.getHostDebuggerPathBase(),
            containerPath: runOptions.os === 'Windows' ? 'C:\\remote_debugger' : '/remote_debugger',
            permissions: 'ro'
        };

        const nugetVolume: DockerContainerVolume = {
            localPath: path.join(os.homedir(), '.nuget', 'packages'),
            containerPath: runOptions.os === 'Windows' ? 'C:\\.nuget\\packages' : '/root/.nuget/packages',
            permissions: 'ro'
        };

        let programFilesEnvironmentVariable: string | undefined;

        if (os.platform() === 'win32') {
            programFilesEnvironmentVariable = process.env.ProgramFiles;

            if (programFilesEnvironmentVariable === undefined) {
                throw new Error('The environment variable \'ProgramFiles\' is not defined. This variable is used to locate the NuGet fallback folder.');
            }
        }

        const nugetFallbackVolume: DockerContainerVolume = {
            localPath: os.platform() === 'win32' ? path.join(programFilesEnvironmentVariable, 'dotnet', 'sdk', 'NuGetFallbackFolder') :
                (os.platform() === 'darwin' ? MacNuGetPackageFallbackFolderPath : LinuxNuGetPackageFallbackFolderPath),
            containerPath: runOptions.os === 'Windows' ? 'C:\\.nuget\\fallbackpackages' : '/root/.nuget/fallbackpackages',
            permissions: 'ro'
        };

        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, appVolume);
        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, srcVolume);
        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, debuggerVolume);
        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, nugetVolume);
        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, nugetFallbackVolume);

        if (userSecrets || ssl) {
            const hostSecretsFolders = LocalAspNetCoreSslManager.getHostSecretsFolders();
            const containerSecretsFolders = LocalAspNetCoreSslManager.getContainerSecretsFolders(runOptions.os);

            const userSecretsVolume: DockerContainerVolume = {
                localPath: hostSecretsFolders.userSecretsFolder,
                containerPath: containerSecretsFolders.userSecretsFolder,
                permissions: 'ro'
            };

            NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, userSecretsVolume);

            if (ssl) {
                const certVolume: DockerContainerVolume = {
                    localPath: hostSecretsFolders.certificateFolder,
                    containerPath: containerSecretsFolders.certificateFolder,
                    permissions: 'ro'
                };

                NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, certVolume);
            }
        }

        return volumes;
    }

    private static addVolumeWithoutConflicts(volumes: DockerContainerVolume[], volume: DockerContainerVolume): boolean {
        if (volumes.find(v => v.containerPath === volume.containerPath)) {
            return false;
        }

        volumes.push(volume);
        return true;
    }

}
