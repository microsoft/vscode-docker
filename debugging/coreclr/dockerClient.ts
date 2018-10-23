/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import CommandLineBuilder from "./commandLineBuilder";
import { LineSplitter } from "./lineSplitter";
import { ProcessProvider } from "./processProvider";

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
    labels?: { [key: string]: string };
    volumes?: DockerContainerVolume[];
};

export type DockerVersionOptions = {
    format?: string;
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
}

export class CliDockerClient implements DockerClient {
    constructor(private readonly processProvider: ProcessProvider) {
        // CONSIDER: Use dockerode client as basis for debugging.
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

        await this.processProvider.exec(command, { progress: buildProgress });

        lineSplitter.close();

        if (!imageId) {
            throw new Error('The Docker image was built successfully but the image ID could not be retrieved.');
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
                    throw new Error(`'${id}' must be defined and at least 12 characters.`)
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
            .create('docker', 'run', '-dt', '-P')
            .withNamedArg('--name', options.containerName)
            .withKeyValueArgs('-e', options.env)
            .withArrayArgs('--env-file', options.envFiles)
            .withKeyValueArgs('--label', options.labels)
            .withArrayArgs('-v', options.volumes, volume => `${volume.localPath}:${volume.containerPath}${volume.permissions ? ':' + volume.permissions : ''}`)
            .withNamedArg('--entrypoint', options.entrypoint)
            .withQuotedArg(imageTagOrId)
            .withArg(options.command)
            .build();

        const result = await this.processProvider.exec(command, {});

        // The '-d' option returns the container ID (with whitespace) upon completion.
        const containerId = result.stdout.trim();

        if (!containerId) {
            throw new Error('The Docker container was run successfully but the container ID could not be retrieved.')
        }

        return containerId;
    }

    public trimId(id: string): string {
        if (!id) {
            throw new Error('The ID to be trimmed must be non-empty.');
        }

        const trimmedId = id.trim();

        if (trimmedId.length < 12) {
            throw new Error('The ID to be trimmed must be at least 12 characters.');
        }

        return id.substring(0, 12);
    }
}

export default CliDockerClient;
