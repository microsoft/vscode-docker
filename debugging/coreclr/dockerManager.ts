/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { Memento } from 'vscode';
import { AppStorageProvider } from './appStorage';
import { DebuggerClient } from './debuggerClient';
import { DockerBuildImageOptions, DockerClient, DockerContainerVolume, DockerRunContainerOptions } from "./dockerClient";
import { FileSystemProvider } from './fsProvider';
import Lazy from './lazy';
import { OSProvider, PlatformType } from './osProvider';
import { OutputManager } from './outputManager';
import { ProcessProvider } from './processProvider';

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
        os: PlatformType;
    };

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type LaunchOptions = {
    appFolder: string;
    appOutput: string;
    build: Omit<DockerManagerBuildImageOptions, 'appFolder'>;
    run: Omit<DockerManagerRunContainerOptions, 'appFolder'>;
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
};

type LastImageBuildMetadata = {
    dockerfileHash: string;
    dockerIgnoreHash: string | undefined;
    imageId: string;
    options: DockerBuildImageOptions;
};

type LastContainerRunMetadata = {
    containerId: string;
    options: DockerRunContainerOptions;
}

export interface DockerManager {
    buildImage(options: DockerManagerBuildImageOptions): Promise<string>;
    runContainer(imageTagOrId: string, options: DockerManagerRunContainerOptions): Promise<string>;
    prepareForLaunch(options: LaunchOptions): Promise<LaunchResult>;
    cleanupAfterLaunch(): Promise<void>;
}

export const MacNuGetPackageFallbackFolderPath = '/usr/local/share/dotnet/sdk/NuGetFallbackFolder';

export class DefaultDockerManager implements DockerManager {
    private static readonly DebugContainersKey: string = 'DefaultDockerManager.debugContainers';

    constructor(
        private readonly appCacheFactory: AppStorageProvider,
        private readonly debuggerClient: DebuggerClient,
        private readonly dockerClient: DockerClient,
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

            if (imageObject
                && buildMetadata.options
                && buildMetadata.options.context === options.context
                && buildMetadata.options.tag === options.tag
                && buildMetadata.options.target === options.target) {
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

        const debuggerFolder = await this.debuggerClient.getDebugger(options.os);

        const command = options.os === 'Windows'
            ? '-t localhost'
            : '-f /dev/null';

        const entrypoint = options.os === 'Windows'
            ? 'ping'
            : 'tail';

        const volumes = this.getVolumes(debuggerFolder, options);

        const containerId = await this.dockerOutputManager.performOperation(
            'Starting container...',
            async () => {
                const containers = (await this.dockerClient.listContainers({ format: '{{.Names}}' })).split('\n');

                if (containers.find(container => container === options.containerName)) {
                    await this.dockerClient.removeContainer(options.containerName, { force: true });
                }

                return await this.dockerClient.runContainer(
                    imageTagOrId,
                    {
                        command,
                        containerName: options.containerName,
                        entrypoint,
                        volumes
                    });
            },
            id => `Container ${this.dockerClient.trimId(id)} started.`,
            err => `Unable to start container: ${err}`);

        const cache = await this.appCacheFactory.getStorage(options.appFolder);

        await cache.update<LastContainerRunMetadata>(
            'run',
            {
                containerId,
                options
            });

        return containerId;
    }

    public async prepareForLaunch(options: LaunchOptions): Promise<LaunchResult> {
        const imageId = await this.buildImage({ appFolder: options.appFolder, ...options.build });

        const containerId = await this.runContainer(imageId, { appFolder: options.appFolder, ...options.run });

        await this.addToDebugContainers(containerId);

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
            debuggerPath: options.run.os === 'Windows' ? 'C:\\remote_debugger\\vsdbg' : '/remote_debugger/vsdbg',
            // tslint:disable-next-line:no-invalid-template-strings
            pipeArgs: ['exec', '-i', containerId, '${debuggerCommand}'],
            // tslint:disable-next-line:no-invalid-template-strings
            pipeCwd: '${workspaceFolder}',
            pipeProgram: 'docker',
            program: 'dotnet',
            programArgs: [additionalProbingPathsArgs, containerAppOutput],
            programCwd: options.run.os === 'Windows' ? 'C:\\app' : '/app'
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
        const webPorts = await this.dockerClient.inspectObject(containerNameOrId, { format: '{{(index (index .NetworkSettings.Ports \\\"80/tcp\\\") 0).HostPort}}' });

        if (webPorts) {
            const webPort = webPorts.split('\n')[0];

            // tslint:disable-next-line:no-http-string
            return `http://localhost:${webPort}`;
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

        const nugetFallbackVolume: DockerContainerVolume = {
            localPath: this.osProvider.os === 'Windows' ? path.join(this.processProvider.env[DefaultDockerManager.ProgramFilesEnvironmentVariable], 'dotnet', 'sdk', 'NuGetFallbackFolder') : MacNuGetPackageFallbackFolderPath,
            containerPath: options.os === 'Windows' ? 'C:\\.nuget\\fallbackpackages' : '/root/.nuget/fallbackpackages',
            permissions: 'ro'
        };

        const volumes: DockerContainerVolume[] = [
            appVolume,
            debuggerVolume,
            nugetVolume,
            nugetFallbackVolume
        ];

        return volumes;
    }
}
