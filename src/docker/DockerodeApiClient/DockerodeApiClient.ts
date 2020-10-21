/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Dockerode = require('dockerode');
import { IActionContext, parseError } from 'vscode-azureextensionui';
import { CancellationToken } from 'vscode-languageclient';
import { localize } from '../../localize';
import { isWindows } from '../../utils/osUtils';
import { execAsync } from '../../utils/spawnAsync';
import { DockerInfo, PruneResult } from '../Common';
import { DockerContainer, DockerContainerInspection } from '../Containers';
import { ContextChangeCancelClient } from '../ContextChangeCancelClient';
import { DockerContext } from '../Contexts';
import { DockerApiClient, DockerExecOptions } from '../DockerApiClient';
import { DockerImage, DockerImageInspection } from '../Images';
import { DockerNetwork, DockerNetworkInspection, DriverType } from '../Networks';
import { DockerVersion } from '../Version';
import { DockerVolume, DockerVolumeInspection } from '../Volumes';
import { getContainerName, getFullTagFromDigest, refreshDockerode } from './DockerodeUtils';

// 20 s timeout for all calls (enough time for any call, but short enough to be UX-reasonable)
const dockerodeCallTimeout = 20 * 1000;

export class DockerodeApiClient extends ContextChangeCancelClient implements DockerApiClient {
    private readonly dockerodeClient: Dockerode;

    public constructor(currentContext: DockerContext) {
        super();
        this.dockerodeClient = refreshDockerode(currentContext);
    }

    public async info(context: IActionContext, token?: CancellationToken): Promise<DockerInfo> {
        return this.callWithErrorHandling(context, async () => this.dockerodeClient.info(), token);
    }

    public async version(context: IActionContext, token?: CancellationToken): Promise<DockerVersion> {
        return this.callWithErrorHandling(context, async () => <DockerVersion>this.dockerodeClient.version(), token);
    }

    public async getContainers(context: IActionContext, token?: CancellationToken): Promise<DockerContainer[]> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.listContainers({ all: true }), token);

        return result.map(ci => {
            return {
                ...ci,
                Name: getContainerName(ci),
                CreatedTime: ci.Created * 1000,
                State: ci.State,
            }
        });
    }

    public async inspectContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerContainerInspection> {
        const container = this.dockerodeClient.getContainer(ref);
        const result = await this.callWithErrorHandling(context, async () => container.inspect(), token);

        return {
            ...result,
            CreatedTime: new Date(result.Created).valueOf(),
        } as DockerContainerInspection;
    }

    public async execInContainer(context: IActionContext, ref: string, command: string[], options?: DockerExecOptions, token?: CancellationToken): Promise<string> {

        // NOTE: Dockerode's exec() doesn't seem to work with Windows against the socket endpoint.
        //       https://github.com/apocas/dockerode/issues/534

        if (isWindows()) {
            let dockerCommand = 'docker exec ';

            if (options?.user) {
                dockerCommand += `--user "${options.user}" `;
            }

            dockerCommand += `"${ref}" ${command.join(' ')}`;

            const results = await execAsync(dockerCommand);

            return results.stdout;
        } else {
            const container = this.dockerodeClient.getContainer(ref);

            const exec = await container.exec({
                AttachStderr: true,
                AttachStdout: true,
                // TODO: This makes sense only for Linux; should caller comprehend shell to use?
                Cmd: ['/bin/sh', '-c', ...command],
                User: options?.user
            });

            const stream = await exec.start({
            });

            return new Promise<string>(
                (resolve, reject) => {

                    const chunks = [];

                    stream.on('data', chunk => {
                        chunks.push(chunk);
                    });

                    stream.on('end', () => {
                        // TODO: How do we determine errors (as error text will be mixed with normal text)?
                        resolve(Buffer.concat(chunks).toString('utf8'));
                    });
                });
            }
        }

    public async getContainerFile(context: IActionContext, ref: string, path: string, token?: CancellationToken): Promise<Buffer> {
        // const localPath = corepath.join(os.tmpdir(), 'testfile.txt');

        // const command = `docker cp "${ref}:${path}" "${localPath}"`;

        // await execAsync(command, {});

        // // TODO: Read from temp path.

        // try {
        //     // NOTE: False positive: https://github.com/nodesecurity/eslint-plugin-security/issues/65
        //     // eslint-disable-next-line @typescript-eslint/tslint/config
        //     return await fs.readFile(localPath);
        // } finally {
        //     await fs.remove(localPath);
        // }

        const container = this.dockerodeClient.getContainer(ref);

        const stream = await this.callWithErrorHandling(context, () => container.getArchive({ path }));

        return await new Promise(
            (resolve, reject) => {
                const chunks = [];

                stream.on('data', chunk => {
                    chunks.push(chunk);
                });

                stream.on('error', error => {
                    reject(error);
                });

                stream.on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
            });
    }

    public async getContainerLogs(context: IActionContext, ref: string, token?: CancellationToken): Promise<NodeJS.ReadableStream> {
        const container = this.dockerodeClient.getContainer(ref);
        return this.callWithErrorHandling(context, async () => container.logs({ follow: true, stdout: true }));
    }

    public async pruneContainers(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.pruneContainers(), token);
        return {
            ...result,
            ObjectsDeleted: result.ContainersDeleted?.length ?? 0,
        };
    }

    public async startContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const container = this.dockerodeClient.getContainer(ref);
        return this.callWithErrorHandling(context, async () => container.start(), token);
    }

    public async restartContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const container = this.dockerodeClient.getContainer(ref);
        return this.callWithErrorHandling(context, async () => container.restart(), token);
    }

    public async stopContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const container = this.dockerodeClient.getContainer(ref);
        return this.callWithErrorHandling(context, async () => container.stop(), token);
    }

    public async removeContainer(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const container = this.dockerodeClient.getContainer(ref);
        return this.callWithErrorHandling(context, async () => container.remove({ force: true }), token);
    }

    public async getImages(context: IActionContext, token?: CancellationToken): Promise<DockerImage[]> {
        const images = await this.callWithErrorHandling(context, async () => this.dockerodeClient.listImages({ filters: { "dangling": ["false"] } }), token);
        const result: DockerImage[] = [];

        for (const image of images) {
            if (!image.RepoTags) {
                const fullTag = getFullTagFromDigest(image);

                result.push({
                    ...image,
                    Name: fullTag,
                    CreatedTime: image.Created * 1000,
                });
            } else {
                for (const fullTag of image.RepoTags) {
                    result.push({
                        ...image,
                        Name: fullTag,
                        CreatedTime: image.Created * 1000,
                    });
                }
            }
        }

        return result;
    }

    public async inspectImage(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerImageInspection> {
        const image = this.dockerodeClient.getImage(ref);
        const result = await this.callWithErrorHandling(context, async () => image.inspect(), token);

        return {
            ...result,
            CreatedTime: new Date(result.Created).valueOf(),
            Name: undefined, // Not needed on inspect info
        };
    }

    public async pruneImages(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.pruneImages(), token);
        return {
            ...result,
            ObjectsDeleted: result.ImagesDeleted?.length ?? 0,
        };
    }

    public async tagImage(context: IActionContext, ref: string, fullTag: string, token?: CancellationToken): Promise<void> {
        const repo = fullTag.substr(0, fullTag.lastIndexOf(':'));
        const tag = fullTag.substr(fullTag.lastIndexOf(':') + 1);
        const image = this.dockerodeClient.getImage(ref);
        await this.callWithErrorHandling(context, async () => image.tag({ repo: repo, tag: tag }), token);
    }

    public async removeImage(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const image: Dockerode.Image = this.dockerodeClient.getImage(ref);
        return this.callWithErrorHandling(context, async () => image.remove({ force: true }), token);
    }

    public async getNetworks(context: IActionContext, token?: CancellationToken): Promise<DockerNetwork[]> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.listNetworks(), token);

        return result.map(ni => {
            return {
                ...ni,
                // eslint-disable-next-line @typescript-eslint/tslint/config
                CreatedTime: new Date(ni.Created).valueOf(),
            }
        });
    }

    public async inspectNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerNetworkInspection> {
        const network = this.dockerodeClient.getNetwork(ref);
        const result = await this.callWithErrorHandling(context, async () => network.inspect(), token);

        return {
            ...result,
            // eslint-disable-next-line @typescript-eslint/tslint/config
            CreatedTime: new Date(result.Created).valueOf(),
        };
    }

    public async pruneNetworks(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.pruneNetworks(), token);
        return {
            SpaceReclaimed: 0,
            ObjectsDeleted: result.NetworksDeleted?.length ?? 0,
        };
    }

    public async createNetwork(context: IActionContext, options: { Name: string, Driver: DriverType }, token?: CancellationToken): Promise<void> {
        await this.callWithErrorHandling(context, async () => this.dockerodeClient.createNetwork(options), token);
    }

    public async removeNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const network = this.dockerodeClient.getNetwork(ref);
        return this.callWithErrorHandling(context, async () => network.remove({ force: true }), token);
    }

    public async getVolumes(context: IActionContext, token?: CancellationToken): Promise<DockerVolume[]> {
        const result = (await this.callWithErrorHandling(context, async () => this.dockerodeClient.listVolumes(), token)).Volumes;

        return result.map(vi => {
            return {
                ...vi,
                // eslint-disable-next-line @typescript-eslint/tslint/config, @typescript-eslint/no-explicit-any
                CreatedTime: new Date((vi as any).CreatedAt).valueOf(),
                Id: undefined, // Not defined for volumes
            }
        });
    }

    public async inspectVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerVolumeInspection> {
        const volume = this.dockerodeClient.getVolume(ref);
        const result = await this.callWithErrorHandling(context, async () => volume.inspect(), token);

        return {
            ...result,
            // eslint-disable-next-line @typescript-eslint/tslint/config, @typescript-eslint/no-explicit-any
            CreatedTime: new Date((result as any).CreatedAt).valueOf(),
            Id: undefined, // Not defined for volumes
        };
    }

    public async pruneVolumes(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.pruneVolumes(), token);
        return {
            ...result,
            ObjectsDeleted: result.VolumesDeleted?.length ?? 0,
        };
    }

    public async removeVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<void> {
        const volume = this.dockerodeClient.getVolume(ref);
        return this.callWithErrorHandling(context, async () => volume.remove({ force: true }), token);
    }

    private async callWithErrorHandling<T>(context: IActionContext, callback: () => Promise<T>, token?: CancellationToken): Promise<T> {
        try {
            return await this.withTimeoutAndCancellations(context, callback, dockerodeCallTimeout, token);
        } catch (err) {
            if (context) {
                context.errorHandling.suppressReportIssue = true;
            }

            const error = parseError(err);

            if (error?.errorType === 'ENOENT') {
                throw new Error(localize('vscode-docker.utils.dockerode.failedToConnect', 'Failed to connect. Is Docker installed and running? Error: {0}', error.message));
            }

            throw err;
        }
    }
}
