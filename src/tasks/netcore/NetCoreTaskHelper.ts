import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { CancellationToken, WorkspaceFolder } from 'vscode';
import { LocalAspNetCoreSslManager } from '../../debugging/coreclr/LocalAspNetCoreSslManager';
import { DockerBuildOptions, DockerBuildTask } from '../DockerBuildTaskProvider';
import { DockerContainerVolume, DockerRunOptions, DockerRunTask } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NetCoreTaskOptions {
    appProject: string;
    configureSsl?: boolean;
}

const UserSecretsRegex = /UserSecretsId/i;
const MacNuGetPackageFallbackFolderPath = '/usr/local/share/dotnet/sdk/NuGetFallbackFolder';
const LinuxNuGetPackageFallbackFolderPath = '/usr/share/dotnet/sdk/NuGetFallbackFolder';

export type NetCoreTaskHelperType = TaskHelper<NetCoreTaskOptions, NetCoreTaskOptions>;

export class NetCoreTaskHelper implements NetCoreTaskHelperType {
    private static readonly defaultLabels: { [key: string]: string } = { 'com.microsoft.created-by': 'visual-studio-code' };

    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        throw new Error('Method not implemented.');
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDockerBuildOptions(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, helperOptions: NetCoreTaskOptions | undefined, token?: CancellationToken): Promise<DockerBuildOptions> {
        if (helperOptions.appProject === undefined ||
            !await fse.pathExists((helperOptions.appProject = NetCoreTaskHelper.resolveFolderPath(helperOptions.appProject, folder)))) {
            throw new Error('The \'netCore.appProject\' in the Docker Build definition is undefined or does not exist. Ensure that the property is set to the appropriate .NET Core project.');
        }

        const appName = await this.inferAppName(folder, helperOptions);

        // tslint:disable: no-invalid-template-strings
        buildOptions.context = buildOptions.context || '${workspaceFolder}';
        buildOptions.dockerfile = buildOptions.dockerfile || path.join('${workspaceFolder}', 'Dockerfile');
        // tslint:enable: no-invalid-template-strings
        buildOptions.tag = buildOptions.tag || `${appName}:dev`;
        buildOptions.target = buildOptions.target || 'base';
        buildOptions.labels = buildOptions.labels || NetCoreTaskHelper.defaultLabels;

        return buildOptions;
    }

    public async resolveDockerRunOptions(folder: WorkspaceFolder, runOptions: DockerRunOptions, helperOptions: NetCoreTaskOptions | undefined, token?: CancellationToken): Promise<DockerRunOptions> {
        if (helperOptions.appProject === undefined ||
            !await fse.pathExists((helperOptions.appProject = NetCoreTaskHelper.resolveFolderPath(helperOptions.appProject, folder)))) {
            throw new Error('The \'netCore.appProject\' in the Docker Run definition is undefined or does not exist. Ensure that the property is set to the appropriate .NET Core project.');
        }

        const appName = await this.inferAppName(folder, helperOptions);

        runOptions.containerName = runOptions.containerName || `${appName}-dev`;
        runOptions.labels = runOptions.labels || NetCoreTaskHelper.defaultLabels;
        runOptions.os = runOptions.os || 'Linux';
        runOptions.image = runOptions.image || `${appName}:dev`;

        runOptions.entrypoint = runOptions.entrypoint || runOptions.os === 'Windows' ? 'ping' : 'tail';
        runOptions.command = runOptions.command || runOptions.os === 'Windows' ? '-t localhost' : '-f /dev/null';

        const ssl = helperOptions.configureSsl !== undefined ? helperOptions.configureSsl : await this.inferSsl(folder, helperOptions);
        const userSecrets = ssl === true ? true : await this.inferUserSecrets(folder, helperOptions);

        if (userSecrets) {
            runOptions.env = runOptions.env || {};
            runOptions.env.ASPNETCORE_ENVIRONMENT = runOptions.env.ASPNETCORE_ENVIRONMENT || 'Development';

            if (ssl) {
                //tslint:disable-next-line:no-http-string
                runOptions.env.ASPNETCORE_URLS = runOptions.env.ASPNETCORE_URLS || 'http://+:80;https://+:443';
            }
        }

        runOptions.volumes = await this.inferVolumes(folder, runOptions, helperOptions, ssl, userSecrets); // Volumes specifically are unioned with the user input (their input does not override except where the container path is the same)

        return runOptions;
    }

    /*private async inferContext(folder: WorkspaceFolder, buildOptions: DockerBuildOptions): Promise<string> {
        return folder.uri.fsPath;
    }

    private async inferDockerfile(folder: WorkspaceFolder, buildOptions: DockerBuildOptions): Promise<string> {
        let result = path.join(buildOptions.context, 'Dockerfile');

        if (!await fse.pathExists(path.normalize(result))) {
            throw new Error(`The Dockerfile '${result}' does not exist. Ensure that the 'dockerfile' property is set correctly in the Docker debug configuration.`);
        }

        return result;
    }*/

    private async inferAppName(folder: WorkspaceFolder, helperOptions: NetCoreTaskOptions): Promise<string> {
        return path.parse(helperOptions.appProject).name.replace(/\s/i, '').toLowerCase();
    }

    private async inferSsl(folder: WorkspaceFolder, helperOptions: NetCoreTaskOptions): Promise<boolean> {
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
            localPath: path.join(os.homedir(), '.vsdbg'),
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

    private static resolveFolderPath(folderPath: string, folder: WorkspaceFolder): string {
        return folderPath.replace(/\$\{workspaceFolder\}/gi, folder.uri.fsPath);
    }
}
