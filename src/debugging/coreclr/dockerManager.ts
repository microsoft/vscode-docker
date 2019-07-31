/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import deepEqual = require('deep-equal');
import * as path from 'path';
import { Memento } from 'vscode';
import { PlatformOS } from '../../utils/platform';
import { AppStorageProvider } from './appStorage';
import { ProcessProvider } from './ChildProcessProvider';
import { DockerBuildImageOptions, DockerClient, DockerContainerVolume, DockerRunContainerOptions } from "./CliDockerClient";
import { DebuggerClient } from './debuggerClient';
import { FileSystemProvider } from './fsProvider';
import { Lazy } from './lazy';
import { AspNetCoreSslManager } from './LocalAspNetCoreSslManager';
import { OSProvider } from './LocalOSProvider';
import { OutputManager } from './outputManager';

export type DockerManagerBuildImageOptions
    = DockerBuildImageOptions
    & {
        appFolder: string;
        context: string;
        dockerfile: string;
    };

export type DockerManagerRunContainerOptions
    = DockerRunContainerOptions
    & {
        appFolder: string;
        os: PlatformOS;
        configureSslCertificate: boolean;
    };

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type LaunchBuildOptions = Omit<DockerManagerBuildImageOptions, 'appFolder'>;
export type LaunchRunOptions = Omit<DockerManagerRunContainerOptions, 'appFolder'>;

export type LaunchOptions = {
    appFolder: string;
    appOutput: string;
    appProject: string;
    build: LaunchBuildOptions;
    run: LaunchRunOptions;
};

export type LaunchResult = {
    browserUrl: string | undefined;
    debuggerPath: string;
    pipeArgs: string[];
    pipeCwd: string;
    pipeProgram: string;
    program: string;
    programArgs: string[];
    programCwd: string;
    programEnv: { [key: string]: string };
};

type LastImageBuildMetadata = {
    dockerfileHash: string;
    dockerIgnoreHash: string | undefined;
    imageId: string;
    options: DockerBuildImageOptions;
};

interface IHostPort {
    HostIp: string,
    HostPort: string,
}

interface IPortMappings {
    [key: string]: IHostPort[];
}

export interface DockerManager {
    buildImage(options: DockerManagerBuildImageOptions): Promise<string>;
    runContainer(imageTagOrId: string, options: DockerManagerRunContainerOptions): Promise<string>;
    prepareForLaunch(options: LaunchOptions): Promise<LaunchResult>;
    cleanupAfterLaunch(): Promise<void>;
}

export const MacNuGetPackageFallbackFolderPath = '/usr/local/share/dotnet/sdk/NuGetFallbackFolder';
const LinuxNuGetPackageFallbackFolderPath = '/usr/share/dotnet/sdk/NuGetFallbackFolder';

function compareProperty<T, U>(obj1: T | undefined, obj2: T | undefined, getter: (obj: T) => (U | undefined)): boolean {
    const prop1 = obj1 ? getter(obj1) : undefined;
    const prop2 = obj2 ? getter(obj2) : undefined;

    return prop1 === prop2;
}

function compareDictionary<T>(obj1: T | undefined, obj2: T | undefined, getter: (obj: T) => ({ [key: string]: string } | undefined)): boolean {
    const dict1 = (obj1 ? getter(obj1) : {}) || {};
    const dict2 = (obj2 ? getter(obj2) : {}) || {};

    return deepEqual(dict1, dict2);
}

export function compareBuildImageOptions(options1: DockerBuildImageOptions | undefined, options2: DockerBuildImageOptions | undefined): boolean {
    // NOTE: We do not compare options.dockerfile as it (i.e. the name itself) has no impact on the built image.

    if (!compareProperty(options1, options2, options => options.context)) {
        return false;
    }

    if (!compareDictionary(options1, options2, options => options.args)) {
        return false;
    }

    if (!compareProperty(options1, options2, options => options.tag)) {
        return false;
    }

    if (!compareProperty(options1, options2, options => options.target)) {
        return false;
    }

    if (!compareDictionary(options1, options2, options => options.labels)) {
        return false;
    }

    return true;
}

export class DefaultDockerManager implements DockerManager {
    private static readonly DebugContainersKey: string = 'DefaultDockerManager.debugContainers';

    constructor(
        private readonly appCacheFactory: AppStorageProvider,
        private readonly debuggerClient: DebuggerClient,
        private readonly dockerClient: DockerClient,
        private readonly aspNetCoreSslManager: AspNetCoreSslManager,
        private readonly dockerOutputManager: OutputManager,
        private readonly fileSystemProvider: FileSystemProvider,
        private readonly osProvider: OSProvider,
        private readonly processProvider: ProcessProvider,
        private readonly workspaceState: Memento) {
    }

    public async buildImage(options: DockerManagerBuildImageOptions): Promise<string> {
        const cache = await this.appCacheFactory.getStorage(options.appFolder);
        const buildMetadata = await cache.get<LastImageBuildMetadata>('build');
        const dockerIgnorePath = path.join(options.context, '.dockerignore');

        const dockerfileHasher = new Lazy(async () => await this.fileSystemProvider.hashFile(options.dockerfile));
        const dockerIgnoreHasher = new Lazy(
            async () => {
                if (await this.fileSystemProvider.fileExists(dockerIgnorePath)) {
                    return await this.fileSystemProvider.hashFile(dockerIgnorePath);
                } else {
                    return undefined;
                }
            });

        if (buildMetadata && buildMetadata.imageId) {
            const imageObject = await this.dockerClient.inspectObject(buildMetadata.imageId);

            if (imageObject && compareBuildImageOptions(buildMetadata.options, options)) {
                const currentDockerfileHash = await dockerfileHasher.value;
                const currentDockerIgnoreHash = await dockerIgnoreHasher.value;

                if (buildMetadata.dockerfileHash === currentDockerfileHash
                    && buildMetadata.dockerIgnoreHash === currentDockerIgnoreHash) {

                    // The image is up to date, no build is necessary...
                    return buildMetadata.imageId;
                }
            }
        }

        const imageId = await this.dockerOutputManager.performOperation(
            'Building Docker image...',
            async outputManager => await this.dockerClient.buildImage(options, content => outputManager.append(content)),
            id => `Docker image ${this.dockerClient.trimId(id)} built.`,
            err => `Failed to build Docker image: ${err}`);

        const dockerfileHash = await dockerfileHasher.value;
        const dockerIgnoreHash = await dockerIgnoreHasher.value;

        await cache.update<LastImageBuildMetadata>(
            'build',
            {
                dockerfileHash,
                dockerIgnoreHash,
                imageId,
                options
            });

        return imageId;
    }

    public async runContainer(imageTagOrId: string, options: DockerManagerRunContainerOptions): Promise<string> {
        if (options.containerName === undefined) {
            throw new Error('No container name was provided.');
        }

        const containerName = options.containerName;

        const debuggerFolder = await this.debuggerClient.getDebuggerFolder();

        const command = options.os === 'Windows'
            ? '-t localhost'
            : '-f /dev/null';

        const entrypoint = options.os === 'Windows'
            ? 'ping'
            : 'tail';

        const additionalVolumes = this.getVolumes(debuggerFolder, options);

        const containerId = await this.dockerOutputManager.performOperation(
            'Starting container...',
            async () => {
                const containers = (await this.dockerClient.listContainers({ format: '{{.Names}}' })).split('\n');

                if (containers.find(container => container === containerName)) {
                    await this.dockerClient.removeContainer(containerName, { force: true });
                }

                return await this.dockerClient.runContainer(
                    imageTagOrId,
                    {
                        command,
                        containerName: options.containerName,
                        entrypoint,
                        env: options.env,
                        envFiles: options.envFiles,
                        extraHosts: options.extraHosts,
                        labels: options.labels,
                        network: options.network,
                        networkAlias: options.networkAlias,
                        ports: options.ports,
                        volumes: [...(additionalVolumes || []), ...(options.volumes || [])]
                    });
            },
            id => `Container ${this.dockerClient.trimId(id)} started.`,
            err => `Unable to start container: ${err}`);

        return containerId;
    }

    public async prepareForLaunch(options: LaunchOptions): Promise<LaunchResult> {
        const imageId = await this.buildImage({ appFolder: options.appFolder, ...options.build });

        if (options.run.configureSslCertificate) {
            const appOutputName = this.osProvider.pathParse(options.run.os, options.appOutput).name;
            const certificateExportPath = path.join(this.aspNetCoreSslManager.getHostSecretsFolders().certificateFolder, `${appOutputName}.pfx`);
            await this.aspNetCoreSslManager.trustCertificateIfNecessary();
            await this.aspNetCoreSslManager.exportCertificateIfNecessary(options.appProject, certificateExportPath);
        }

        const containerId = await this.runContainer(imageId, { appFolder: options.appFolder, ...options.run });

        await this.addToDebugContainers(containerId);

        const debuggerPath = await this.debuggerClient.getDebugger(options.run.os, containerId);

        const browserUrl = await this.getContainerWebEndpoint(containerId);

        const additionalProbingPaths = options.run.os === 'Windows'
            ? [
                'C:\\.nuget\\packages',
                'C:\\.nuget\\fallbackpackages'
            ]
            : [
                '/root/.nuget/packages',
                '/root/.nuget/fallbackpackages'
            ];
        const additionalProbingPathsArgs = additionalProbingPaths.map(probingPath => `--additionalProbingPath ${probingPath}`).join(' ');

        const containerAppOutput = options.run.os === 'Windows'
            ? this.osProvider.pathJoin(options.run.os, 'C:\\app', options.appOutput)
            : this.osProvider.pathJoin(options.run.os, '/app', options.appOutput);

        return {
            browserUrl,
            debuggerPath: this.osProvider.pathJoin(options.run.os, options.run.os === 'Windows' ? 'C:\\remote_debugger' : '/remote_debugger', debuggerPath, 'vsdbg'),
            // tslint:disable-next-line:no-invalid-template-strings
            pipeArgs: ['exec', '-i', containerId, '${debuggerCommand}'],
            // tslint:disable-next-line:no-invalid-template-strings
            pipeCwd: '${workspaceFolder}',
            pipeProgram: 'docker',
            program: 'dotnet',
            programArgs: [additionalProbingPathsArgs, containerAppOutput],
            programCwd: options.run.os === 'Windows' ? 'C:\\app' : '/app',
            programEnv: {}
        };
    }

    public async cleanupAfterLaunch(): Promise<void> {
        const debugContainers = this.workspaceState.get<string[]>(DefaultDockerManager.DebugContainersKey, []);

        const runningContainers = (await this.dockerClient.listContainers({ format: '{{.ID}}' })).split('\n');

        let remainingContainers;

        if (runningContainers && runningContainers.length >= 0) {
            const removeContainerTasks =
                debugContainers
                    .filter(containerId => runningContainers.find(runningContainerId => this.dockerClient.matchId(containerId, runningContainerId)))
                    .map(
                        async containerId => {
                            try {
                                await this.dockerClient.removeContainer(containerId, { force: true });

                                this.dockerOutputManager.appendLine(`Container ${this.dockerClient.trimId(containerId)} removed.`);

                                return undefined;
                            } catch {
                                return containerId;
                            }
                        });

            remainingContainers = (await Promise.all(removeContainerTasks)).filter(containerId => containerId !== undefined);
        } else {
            remainingContainers = [];
        }

        await this.workspaceState.update(DefaultDockerManager.DebugContainersKey, remainingContainers);
    }

    private async addToDebugContainers(containerId: string): Promise<void> {
        const runningContainers = this.workspaceState.get<string[]>(DefaultDockerManager.DebugContainersKey, []);

        runningContainers.push(containerId);

        await this.workspaceState.update(DefaultDockerManager.DebugContainersKey, runningContainers);
    }

    private async getContainerWebEndpoint(containerNameOrId: string): Promise<string | undefined> {
        let portMappingsString = await this.dockerClient.inspectObject(containerNameOrId, { format: '{{json .NetworkSettings.Ports}}' });
        let portMappings = <IPortMappings>JSON.parse(portMappingsString);

        if (portMappings) {
            let httpsPort = portMappings["443/tcp"] && portMappings["443/tcp"][0] && portMappings["443/tcp"][0].HostPort || null;
            let httpPort = portMappings["80/tcp"] && portMappings["80/tcp"][0] && portMappings["80/tcp"][0].HostPort || null;

            if (httpsPort) {
                return `https://localhost:${httpsPort}`;
            } else if (httpPort) {
                // tslint:disable-next-line:no-http-string
                return `http://localhost:${httpPort}`;
            }
        }

        return undefined;
    }

    private static readonly ProgramFilesEnvironmentVariable: string = 'ProgramFiles';

    private getVolumes(debuggerFolder: string, options: DockerManagerRunContainerOptions): DockerContainerVolume[] {
        const appVolume: DockerContainerVolume = {
            localPath: options.appFolder,
            containerPath: options.os === 'Windows' ? 'C:\\app' : '/app',
            permissions: 'rw'
        };

        const debuggerVolume: DockerContainerVolume = {
            localPath: debuggerFolder,
            containerPath: options.os === 'Windows' ? 'C:\\remote_debugger' : '/remote_debugger',
            permissions: 'ro'
        };

        const nugetVolume: DockerContainerVolume = {
            localPath: path.join(this.osProvider.homedir, '.nuget', 'packages'),
            containerPath: options.os === 'Windows' ? 'C:\\.nuget\\packages' : '/root/.nuget/packages',
            permissions: 'ro'
        };

        let programFilesEnvironmentVariable: string | undefined;

        if (this.osProvider.os === 'Windows') {
            programFilesEnvironmentVariable = this.processProvider.env[DefaultDockerManager.ProgramFilesEnvironmentVariable];

            if (programFilesEnvironmentVariable === undefined) {
                throw new Error(`The environment variable '${DefaultDockerManager.ProgramFilesEnvironmentVariable}' is not defined. This variable is used to locate the NuGet fallback folder.`);
            }
        }

        const nugetFallbackVolume: DockerContainerVolume = {
            localPath: this.osProvider.os === 'Windows' ? path.join(programFilesEnvironmentVariable, 'dotnet', 'sdk', 'NuGetFallbackFolder') :
                (this.osProvider.isMac ? MacNuGetPackageFallbackFolderPath : LinuxNuGetPackageFallbackFolderPath),
            containerPath: options.os === 'Windows' ? 'C:\\.nuget\\fallbackpackages' : '/root/.nuget/fallbackpackages',
            permissions: 'ro'
        };

        let volumes: DockerContainerVolume[] = [
            appVolume,
            debuggerVolume,
            nugetVolume,
            nugetFallbackVolume,
        ];

        if (options.configureSslCertificate) {
            const hostSecretsFolders = this.aspNetCoreSslManager.getHostSecretsFolders();
            const containerSecretsFolders = this.aspNetCoreSslManager.getContainerSecretsFolders(options.os);

            const certVolume: DockerContainerVolume = {
                localPath: hostSecretsFolders.certificateFolder,
                containerPath: containerSecretsFolders.certificateFolder,
                permissions: 'ro'
            };

            const userSecretsVolume: DockerContainerVolume = {
                localPath: hostSecretsFolders.userSecretsFolder,
                containerPath: containerSecretsFolders.userSecretsFolder,
                permissions: 'ro'
            };

            volumes.push(certVolume);
            volumes.push(userSecretsVolume);
        }

        return volumes;
    }
}
