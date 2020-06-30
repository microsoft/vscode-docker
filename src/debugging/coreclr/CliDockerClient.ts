/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { localize } from "../../localize";
import { CommandLineBuilder } from "../../utils/commandLineBuilder";
import { spawnAsync } from "../../utils/spawnAsync";
import { ProcessProvider } from "./ChildProcessProvider";
import { LineSplitter } from "./lineSplitter";

export type DockerBuildImageOptions = {
    args?: { [key: string]: string };
    context?: string;
    dockerfile?: string;
    labels?: { [key: string]: string };
    tag?: string;
    target?: string;
};

export type DockerInspectObjectOptions = {
    format?: string;
};

export type DockerContainersListOptions = {
    format?: string;
};

export type DockerContainerRemoveOptions = {
    force?: boolean;
};

export type DockerContainerPort = {
    hostPort?: string;
    containerPort: string;
    protocol?: 'tcp' | 'udp';
}

export type DockerContainerExtraHost = {
    hostname: string;
    ip: string;
}

export type DockerContainerVolume = {
    localPath: string;
    containerPath: string;
    permissions?: 'ro' | 'rw';
};

export type DockerRunContainerOptions = {
    command?: string;
    containerName?: string;
    entrypoint?: string;
    env?: { [key: string]: string };
    envFiles?: string[];
    extraHosts?: DockerContainerExtraHost[];
    labels?: { [key: string]: string };
    network?: string;
    networkAlias?: string;
    ports?: DockerContainerPort[];
    volumes?: DockerContainerVolume[];
};

export type DockerVersionOptions = {
    format?: string;
}

export type DockerExecOptions = {
    interactive?: boolean;
    tty?: boolean;
    progress?(content: string): void;
}

export interface IHostPort {
    HostIp: string,
    HostPort: string,
}

export interface IPortMappings {
    [key: string]: IHostPort[];
}

export interface DockerClient {
    buildImage(options: DockerBuildImageOptions, progress?: (content: string) => void): Promise<string>;
    getVersion(options?: DockerVersionOptions): Promise<string>;
    inspectObject(nameOrId: string, options?: DockerInspectObjectOptions): Promise<string | undefined>;
    listContainers(options?: DockerContainersListOptions): Promise<string>;
    matchId(id1: string, id2: string): boolean;
    removeContainer(containerNameOrId: string, options?: DockerContainerRemoveOptions): Promise<void>;
    runContainer(imageTagOrId: string, options?: DockerRunContainerOptions): Promise<string>;
    trimId(id: string): string;
    exec(containerNameOrId: string, command: string, options?: DockerExecOptions): Promise<string>;
    getContainerWebEndpoint(containerNameOrId: string): Promise<{ browserUrl: string | undefined, httpsPort: string | undefined }>;
    getHostPort(containerNameOrId: string, port: number): Promise<string | undefined>;
}

export class CliDockerClient implements DockerClient {
    public constructor(private readonly processProvider: ProcessProvider) {
        // CONSIDER: Use API client as basis for debugging.
    }

    public async buildImage(options?: DockerBuildImageOptions, progress?: (content: string) => void): Promise<string> {
        options = options || {};

        let command = CommandLineBuilder
            .create('docker', 'build', '--rm')
            .withNamedArg('-f', options.dockerfile)
            .withKeyValueArgs('--build-arg', options.args)
            .withKeyValueArgs('--label', options.labels)
            .withNamedArg('-t', options.tag)
            .withNamedArg('--target', options.target)
            .withQuotedArg(options.context)
            .build();

        let imageId: string | undefined;

        const lineSplitter = new LineSplitter();

        lineSplitter.onLine(
            line => {
                // Expected output is: 'Successfully built 7cc5654ca3b6'
                const buildSuccessPrefix = 'Successfully built ';

                if (line.startsWith(buildSuccessPrefix)) {
                    imageId = line.substr(buildSuccessPrefix.length, 12);
                }
            });

        const buildProgress =
            (content: string) => {
                if (progress) {
                    progress(content);
                }

                lineSplitter.write(content);
            };

        // Use spawnAsync instead of the usual childProcessProvider, since build output can be long
        // This unfortunately precludes effectively unit testing this method
        await spawnAsync(command, {}, buildProgress);

        lineSplitter.close();

        if (!imageId) {
            throw new Error(localize('vscode-docker.debug.coreclr.noImageId', 'The Docker image was built successfully but the image ID could not be retrieved.'));
        }

        return imageId;
    }

    public async getVersion(options?: DockerVersionOptions): Promise<string> {
        options = options || {};

        const command = CommandLineBuilder
            .create('docker', 'version')
            .withNamedArg('--format', options.format)
            .build();

        const result = await this.processProvider.exec(command, {});

        return result.stdout;
    }

    public async inspectObject(nameOrId: string, options?: DockerInspectObjectOptions): Promise<string | undefined> {
        options = options || {};

        const command = CommandLineBuilder
            .create('docker', 'inspect')
            .withNamedArg('--format', options.format)
            .withQuotedArg(nameOrId)
            .build();

        try {
            const output = await this.processProvider.exec(command, {});

            return output.stdout;
        } catch {
            // Failure (typically) means the object wasn't found...
            return undefined;
        }
    }

    public async listContainers(options?: DockerContainersListOptions): Promise<string> {
        options = options || {};

        const command = CommandLineBuilder
            .create('docker', 'ps', '-a')
            .withNamedArg('--format', options.format)
            .build();

        const output = await this.processProvider.exec(command, {});

        return output.stdout;
    }

    public matchId(id1: string, id2: string): boolean {
        const validateArgument =
            id => {
                if (id === undefined || id1.length < 12) {
                    throw new Error(localize('vscode-docker.debug.coreclr.idNotMatched', '\'{0}\' must be defined and at least 12 characters.', id as string))
                }
            };

        validateArgument(id1);
        validateArgument(id2);

        return id1.length < id2.length
            ? id2.startsWith(id1)
            : id1.startsWith(id2);
    }

    public async removeContainer(containerNameOrId: string, options?: DockerContainerRemoveOptions): Promise<void> {
        options = options || {};

        const command = CommandLineBuilder
            .create('docker', 'rm')
            .withFlagArg('--force', options.force)
            .withQuotedArg(containerNameOrId)
            .build();

        await this.processProvider.exec(command, {});
    }

    public async runContainer(imageTagOrId: string, options?: DockerRunContainerOptions): Promise<string> {
        options = options || {};

        const command = CommandLineBuilder
            .create('docker', 'run', '-dt')
            .withFlagArg('-P', options.ports === undefined || options.ports.length < 1)
            .withNamedArg('--name', options.containerName)
            .withNamedArg('--network', options.network)
            .withNamedArg('--network-alias', options.networkAlias)
            .withKeyValueArgs('-e', options.env)
            .withArrayArgs('--env-file', options.envFiles)
            .withKeyValueArgs('--label', options.labels)
            .withArrayArgs('-v', options.volumes, volume => `${volume.localPath}:${volume.containerPath}${volume.permissions ? ':' + volume.permissions : ''}`)
            .withArrayArgs('-p', options.ports, port => `${port.hostPort ? port.hostPort + ':' : ''}${port.containerPort}${port.protocol ? '/' + port.protocol : ''}`)
            .withArrayArgs('--add-host', options.extraHosts, extraHost => `${extraHost.hostname}:${extraHost.ip}`)
            .withNamedArg('--entrypoint', options.entrypoint)
            .withQuotedArg(imageTagOrId)
            .withArgs(options.command)
            .build();

        const result = await this.processProvider.exec(command, {});

        // The '-d' option returns the container ID (with whitespace) upon completion.
        const containerId = result.stdout.trim();

        if (!containerId) {
            throw new Error(localize('vscode-docker.debug.coreclr.noContainerId', 'The Docker container was run successfully but the container ID could not be retrieved.'))
        }

        return containerId;
    }

    public trimId(id: string): string {
        if (!id) {
            throw new Error(localize('vscode-docker.debug.coreclr.idEmpty', 'The ID to be trimmed must be non-empty.'));
        }

        const trimmedId = id.trim();

        if (trimmedId.length < 12) {
            throw new Error(localize('vscode-docker.debug.coreclr.idShort', 'The ID to be trimmed must be at least 12 characters.'));
        }

        return id.substring(0, 12);
    }

    public async copy(sourcePath: string, destinationPath: string): Promise<string> {
        const command = CommandLineBuilder
            .create('docker', 'cp')
            .withQuotedArg(sourcePath)
            .withQuotedArg(destinationPath)
            .build();

        const output = await this.processProvider.exec(command, {});
        return output.stdout;
    }

    public async exec(containerNameOrId: string, args: string, options?: DockerExecOptions): Promise<string> {
        options = options || {};

        const command = CommandLineBuilder
            .create('docker', 'exec')
            .withFlagArg('-i', options.interactive)
            .withFlagArg('-t', options.tty)
            .withQuotedArg(containerNameOrId)
            .withArg(args)
            .build();

        const result = await this.processProvider.exec(command, { progress: options.progress });

        return result.stdout;
    }

    public async getContainerWebEndpoint(containerNameOrId: string): Promise<{ browserUrl: string | undefined, httpsPort: string | undefined }> {
        let portMappingsString = await this.inspectObject(containerNameOrId, { format: '{{json .NetworkSettings.Ports}}' });

        if (!portMappingsString) {
            return {
                browserUrl: undefined,
                httpsPort: undefined,
            }
        }

        let portMappings = <IPortMappings>JSON.parse(portMappingsString);

        if (portMappings) {
            let httpsPort = portMappings["443/tcp"] && portMappings["443/tcp"][0] && portMappings["443/tcp"][0].HostPort || null;
            let httpPort = portMappings["80/tcp"] && portMappings["80/tcp"][0] && portMappings["80/tcp"][0].HostPort || null;

            if (httpsPort) {
                return {
                    browserUrl: `https://localhost:${httpsPort}`,
                    httpsPort: httpsPort
                };
            } else if (httpPort) {
                return {
                    // tslint:disable-next-line:no-http-string
                    browserUrl: `http://localhost:${httpPort}`,
                    httpsPort: undefined
                };
            }
        }

        return {
            browserUrl: undefined,
            httpsPort: undefined
        };
    }

    public async getHostPort(containerNameOrId: string, containerPort: number): Promise<string | undefined> {
        const hostPort = await this.inspectObject(containerNameOrId, { format: `{{(index (index .NetworkSettings.Ports \\"${containerPort}/tcp\\") 0).HostPort}}` });
        return hostPort ? hostPort.trim() : undefined;
    }
}

export default CliDockerClient;
