import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { CancellationToken, WorkspaceFolder } from 'vscode';
import { ChildProcessProvider } from '../../debugging/coreclr/ChildProcessProvider';
import { DockerContainerVolume } from '../../debugging/coreclr/CliDockerClient';
import { CommandLineDotNetClient, UserSecretsRegex } from '../../debugging/coreclr/CommandLineDotNetClient';
import { LinuxNuGetPackageFallbackFolderPath, MacNuGetPackageFallbackFolderPath } from '../../debugging/coreclr/dockerManager';
import { LocalFileSystemProvider } from '../../debugging/coreclr/fsProvider';
import { AspNetCoreSslManager, LocalAspNetCoreSslManager } from '../../debugging/coreclr/LocalAspNetCoreSslManager';
import { LocalOSProvider } from '../../debugging/coreclr/LocalOSProvider';
import { MsBuildNetCoreProjectProvider, NetCoreProjectProvider } from '../../debugging/coreclr/netCoreProjectProvider';
import { OSTempFileProvider } from '../../debugging/coreclr/tempFileProvider';
import { DockerBuildTask, DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerRunTask, DockerRunTaskDefinition } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NetCoreTaskOptions {
    appProject: string;
    configureSsl?: boolean;
}

export type NetCoreTaskHelperType = TaskHelper<NetCoreTaskOptions, NetCoreTaskOptions>;

export class NetCoreTaskHelper implements NetCoreTaskHelperType {
    private static readonly defaultLabels: { [key: string]: string } = { 'com.microsoft.created-by': 'visual-studio-code' };

    private readonly netCoreProjectProvider: NetCoreProjectProvider;
    private readonly aspNetCoreSslManager: AspNetCoreSslManager;

    constructor() {
        const processProvider = new ChildProcessProvider();
        const fsProvider = new LocalFileSystemProvider();
        const osProvider = new LocalOSProvider();
        const dotNetClient = new CommandLineDotNetClient(
            processProvider,
            fsProvider,
            osProvider
        )

        this.netCoreProjectProvider = new MsBuildNetCoreProjectProvider(
            fsProvider,
            dotNetClient,
            new OSTempFileProvider(
                osProvider,
                processProvider
            )
        );

        this.aspNetCoreSslManager = new LocalAspNetCoreSslManager(
            dotNetClient,
            this.netCoreProjectProvider,
            processProvider,
            osProvider
        );
    }

    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        throw new Error('Method not implemented.');
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDockerBuildTaskDefinition(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, helperOptions: NetCoreTaskOptions | undefined, token?: CancellationToken): Promise<DockerBuildTaskDefinition> {
        if (helperOptions.appProject === undefined ||
            !await fse.pathExists(helperOptions.appProject)) {
            throw new Error('The \'netCore.appProject\' in the Docker Build definition is undefined or does not exist. Ensure that the property is set to the appropriate .NET Core project.');
        }

        buildOptions.context = buildOptions.context || await this.inferContext(folder, buildOptions);
        buildOptions.dockerfile = buildOptions.dockerfile || await this.inferDockerfile(folder, buildOptions);
        buildOptions.tag = buildOptions.tag || `${await this.inferAppName(folder, buildOptions)}:dev`;
        buildOptions.target = buildOptions.target || 'base';
        buildOptions.labels = buildOptions.labels || NetCoreTaskHelper.defaultLabels;

        return buildOptions;
    }

    public async resolveDockerRunTaskDefinition(folder: WorkspaceFolder, definition: DockerRunTaskDefinition, token?: CancellationToken): Promise<DockerRunTaskDefinition> {
        if (definition.netCore.appProject === undefined ||
            !await fse.pathExists(definition.netCore.appProject)) {
            throw new Error('The \'netCore.appProject\' in the Docker Run definition is undefined or does not exist. Ensure that the property is set to the appropriate .NET Core project.');
        }

        const appName = await this.inferAppName(folder, definition);
        const appOutput = await this.inferAppOutput(folder, definition);

        definition.dockerRun.containerName = definition.dockerRun.containerName || `${appName}-dev`;
        definition.dockerRun.labels = definition.dockerRun.labels || NetCoreTaskHelper.defaultLabels;
        definition.dockerRun.os = definition.dockerRun.os || 'Linux';

        const ssl = definition.netCore.configureSsl || await this.inferSsl(folder, definition);
        const userSecrets = ssl === true ? true : await this.inferUserSecrets(folder, definition);

        if (userSecrets) {
            definition.dockerRun.env = definition.dockerRun.env || {};
            definition.dockerRun.env.ASPNETCORE_ENVIRONMENT = definition.dockerRun.env.ASPNETCORE_ENVIRONMENT || 'Development';

            if (ssl) {
                //tslint:disable-next-line:no-http-string
                definition.dockerRun.env.ASPNETCORE_URLS = definition.dockerRun.env.ASPNETCORE_URLS || 'http://+:80;https://+:443';
            }
        }

        definition.dockerRun.volumes = await this.inferVolumes(folder, definition, ssl, userSecrets); // Volumes specifically are unioned with the user input (their input does not override except where the container path is the same)

        return definition;
    }

    private async inferContext(folder: WorkspaceFolder, definition: DockerBuildTaskDefinition): Promise<string> {
        return folder.uri.fsPath;
    }

    private async inferDockerfile(folder: WorkspaceFolder, definition: DockerBuildTaskDefinition): Promise<string> {
        let result = path.join(buildOptions.context, 'Dockerfile');

        if (!await fse.pathExists(result)) {
            throw new Error(`The Dockerfile '${result}' does not exist. Ensure that the 'dockerfile' property is set correctly in the Docker debug configuration.`);
        }

        return result;
    }

    private async inferAppName(folder: WorkspaceFolder, definition: DockerBuildTaskDefinition): Promise<string> {
        return path.basename(definition.netCore.appProject).replace(/\s/i, '').toLowerCase();
    }

    private async inferAppOutput(folder: WorkspaceFolder, definition: DockerBuildTaskDefinition): Promise<string> {
        return await this.netCoreProjectProvider.getTargetPath(definition.netCore.appProject);
    }

    private async inferSsl(folder: WorkspaceFolder, definition: DockerRunTaskDefinition): Promise<boolean> {
        try {
            const launchSettingsPath = path.join(path.dirname(definition.netCore.appProject), 'Properties', 'launchSettings.json');

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

    private async inferUserSecrets(folder: WorkspaceFolder, definition: DockerRunTaskDefinition): Promise<boolean> {
        const contents = await fse.readFile(definition.netCore.appProject);
        return UserSecretsRegex.test(contents.toString());
    }

    private async inferVolumes(folder: WorkspaceFolder, definition: DockerRunTaskDefinition, ssl: boolean, userSecrets: boolean): Promise<DockerContainerVolume[]> {
        const volumes: DockerContainerVolume[] = [];
        const ProgramFiles = 'ProgramFiles';

        if (definition.dockerRun.volumes) {
            for (const volume of definition.dockerRun.volumes) {
                NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, volume);
            }
        }

        const appVolume: DockerContainerVolume = {
            localPath: path.dirname(definition.netCore.appProject),
            containerPath: definition.dockerRun.os === 'Windows' ? 'C:\\app' : '/app',
            permissions: 'rw'
        };

        const srcVolume: DockerContainerVolume = {
            localPath: folder.uri.fsPath,
            containerPath: definition.dockerRun.os === 'Windows' ? 'C:\\src' : '/src',
            permissions: 'rw'
        }

        /*const debuggerVolume: DockerContainerVolume = {
            localPath: debuggerFolder,
            containerPath: options.os === 'Windows' ? 'C:\\remote_debugger' : '/remote_debugger',
            permissions: 'ro'
        };*/

        const nugetVolume: DockerContainerVolume = {
            localPath: path.join(os.homedir(), '.nuget', 'packages'),
            containerPath: definition.dockerRun.os === 'Windows' ? 'C:\\.nuget\\packages' : '/root/.nuget/packages',
            permissions: 'ro'
        };

        let programFilesEnvironmentVariable: string | undefined;

        if (os.platform() === 'win32') {
            programFilesEnvironmentVariable = process.env[ProgramFiles];

            if (programFilesEnvironmentVariable === undefined) {
                throw new Error(`The environment variable '${ProgramFiles}' is not defined. This variable is used to locate the NuGet fallback folder.`);
            }
        }

        const nugetFallbackVolume: DockerContainerVolume = {
            localPath: os.platform() === 'win32' ? path.join(programFilesEnvironmentVariable, 'dotnet', 'sdk', 'NuGetFallbackFolder') :
                (os.platform() === 'darwin' ? MacNuGetPackageFallbackFolderPath : LinuxNuGetPackageFallbackFolderPath),
            containerPath: definition.dockerRun.os === 'Windows' ? 'C:\\.nuget\\fallbackpackages' : '/root/.nuget/fallbackpackages',
            permissions: 'ro'
        };

        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, appVolume);
        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, srcVolume);
        //NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, debuggerVolume);
        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, nugetVolume);
        NetCoreTaskHelper.addVolumeWithoutConflicts(volumes, nugetFallbackVolume);

        if (userSecrets || ssl) {
            const hostSecretsFolders = this.aspNetCoreSslManager.getHostSecretsFolders();
            const containerSecretsFolders = this.aspNetCoreSslManager.getContainerSecretsFolders(definition.dockerRun.os);

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
