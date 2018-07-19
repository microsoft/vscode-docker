/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { ProcessProvider } from "./processProvider";

export type DockerBuildImageOptions = {
    context?: string;
    dockerfile?: string;
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
    volumes?: DockerContainerVolume[];
};

export interface DockerClient {
    buildImage(options: DockerBuildImageOptions, progress?: (content: string) => void): Promise<string>;
    inspectObject(nameOrId: string, options?: DockerInspectObjectOptions): Promise<string | undefined>;
    listContainers(options?: DockerContainersListOptions): Promise<string>;
    matchId(id1: string, id2: string): boolean;
    removeContainer(containerNameOrId: string, options?: DockerContainerRemoveOptions): Promise<void>;
    runContainer(imageTagOrId: string, options?: DockerRunContainerOptions): Promise<string>;
    trimId(id: string): string;
}

export class CliDockerClient implements DockerClient {
    constructor(private readonly processProvider: ProcessProvider) {
    }

    async buildImage(options?: DockerBuildImageOptions, progress?: (content: string) => void): Promise<string> {
        let command = `docker build --rm`;

        if (options && options.dockerfile) {
            command += ` -f ${options.dockerfile}`;
        }

        if (options && options.tag) {
            command += ` -t ${options.tag}`;
        }

        if (options && options.target) {
            command += ` --target ${options.target}`;
        }

        if (options && options.context) {
            command += ` ${options.context}`;
        }

        let imageId: string | undefined;

        // TODO: Handle case where content may not be whole lines.
        const buildProgress =
            (content: string) => {
                if (progress) {
                    progress(content);
                }

                // Last line of expected output is: 'Successfully built 7cc5654ca3b6'
                const buildSuccessPrefix = 'Successfully built ';

                if (content.startsWith(buildSuccessPrefix)) {
                    imageId = content.substr(buildSuccessPrefix.length, 12);
                }
            };

        await this.processProvider.exec(command, { progress: buildProgress });

        if (!imageId) {
            throw new Error('The Docker image was built successfully but the image ID could not be retrieved.');
        }

        return imageId;
    }

    async inspectObject(nameOrId: string, options?: DockerInspectObjectOptions): Promise<string | undefined> {
        let command = 'docker inspect';

        if (options && options.format) {
            command += ` \"--format=${options.format}\"`;
        }

        command += ` ${nameOrId}`;

        try {
            const output = await this.processProvider.exec(command, {});

            return output.stdout;
        } catch {
            // Failure (typically) means the object wasn't found...
            return undefined;
        }
    }

    async listContainers(options?: DockerContainersListOptions): Promise<string> {
        let command = 'docker ps -a';

        if (options && options.format) {
            command += ` \"--format=${options.format}\"`;
        }

        const output = await this.processProvider.exec(command, {});

        return output.stdout;
    }

    matchId(id1: string, id2: string): boolean {
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

    async removeContainer(containerNameOrId: string, options?: DockerContainerRemoveOptions): Promise<void> {
        let command = 'docker rm';

        if (options && options.force) {
            command += ' --force';
        }

        command += ` ${containerNameOrId}`;

        await this.processProvider.exec(command, {});
    }

    async runContainer(imageTagOrId: string, options?: DockerRunContainerOptions): Promise<string> {
        let command = 'docker run -dt -P';

        if (options && options.containerName) {
            command += ` --name ${options.containerName}`;
        }

        if (options && options.volumes) {
            command += ' ' + options.volumes.map(volume => `-v \"${volume.localPath}:${volume.containerPath}${volume.permissions ? ':' + volume.permissions : ''}\"`).join(' ');
        }

        if (options && options.entrypoint) {
            command += ` --entrypoint ${options.entrypoint}`;
        }

        command += ' ' + imageTagOrId;

        if (options && options.command) {
            command += ' ' + options.command;
        }

        const result = await this.processProvider.exec(command, {});

        const containerId = result.stdout.substr(0, result.stdout.length - 1 /* Exclude trailing <CR>. */);

        if (!containerId) {
            throw new Error('The Docker container was run successfully but the container ID could not be retrieved.')
        }

        return containerId;
    }

    trimId(id: string): string {
        return id.substring(0, 12);
    }
}

export default CliDockerClient;
