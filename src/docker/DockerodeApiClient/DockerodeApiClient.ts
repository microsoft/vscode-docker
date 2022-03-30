/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Dockerode from 'dockerode';
import * as nodepath from 'path';
import * as stream from 'stream';
import * as tarstream from 'tar-stream';
import { IActionContext, parseError } from '@microsoft/vscode-azext-utils';
import { CancellationToken } from 'vscode';
import { localize } from '../../localize';
import { addDockerSettingsToEnv } from '../../utils/addDockerSettingsToEnv';
import { cloneObject } from '../../utils/cloneObject';
import { isWindows } from '../../utils/osUtils';
import { bufferToString, execStreamAsync } from '../../utils/spawnAsync';
import { DockerInfo, PruneResult } from '../Common';
import { DockerContainer, DockerContainerInspection } from '../Containers';
import { ContextChangeCancelClient } from '../ContextChangeCancelClient';
import { DockerContext } from '../Contexts';
import { DockerApiClient, DockerExecCommandProvider, DockerExecOptions } from '../DockerApiClient';
import { DockerImage, DockerImageInspection, ImageInspectionContainers } from '../Images';
import { DockerNetwork, DockerNetworkInspection, DriverType } from '../Networks';
import { DockerVersion } from '../Version';
import { DockerVolume, DockerVolumeInspection, VolumeInspectionContainers } from '../Volumes';
import { getContainerName, getFullTagFromDigest, refreshDockerode } from './DockerodeUtils';
import { ext } from '../../extensionVariables';

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
            };
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

    public async execInContainer(context: IActionContext, ref: string, command: string[] | DockerExecCommandProvider, options?: DockerExecOptions, token?: CancellationToken): Promise<{ stdout: string, stderr: string }> {

        // NOTE: Dockerode's exec() doesn't seem to work with Windows against the socket endpoint.
        //       https://github.com/apocas/dockerode/issues/534

        const commandProvider = Array.isArray(command) ? () => command : command;

        if (isWindows()) {
            let dockerCommand = `${ext.dockerContextManager.getDockerCommand(context)} exec `;

            if (options?.user) {
                dockerCommand += `--user "${options.user}" `;
            }

            dockerCommand += `"${ref}" ${commandProvider('windows').join(' ')}`;

            // Copy the Docker environment settings in
            const newEnv: NodeJS.ProcessEnv = cloneObject(process.env);
            addDockerSettingsToEnv(newEnv, process.env);

            const { stdout, stderr } = await execStreamAsync(dockerCommand, { env: newEnv }, token);

            return { stdout, stderr };
        } else {
            const container = this.dockerodeClient.getContainer(ref);

            const exec = await container.exec({
                AttachStderr: true,
                AttachStdout: true,
                Cmd: commandProvider('linux'),
                User: options?.user
            });

            const execStream = await exec.start({
            });

            return new Promise<{ stdout: string, stderr: string }>(
                (resolve, reject) => {
                    const stdoutChunks: Buffer[] = [];
                    const stderrChunks: Buffer[] = [];

                    const stdout = new stream.PassThrough();
                    const stderr = new stream.PassThrough();

                    // TODO: Get demuxStream() included in type definition.
                    container.modem.demuxStream(execStream, stdout, stderr);

                    stdout.on('data', chunk => {
                        stdoutChunks.push(chunk);
                    });

                    stderr.on('data', chunk => {
                        stderrChunks.push(chunk);
                    });

                    execStream.on('end', async () => {
                        try {
                            const inspectInfo = await exec.inspect();

                            const stdoutOutput = bufferToString(Buffer.concat(stdoutChunks));
                            const stderrOutput = bufferToString(Buffer.concat(stderrChunks));

                            if (inspectInfo.ExitCode) {
                                reject(new Error(stderrOutput || stdoutOutput));
                            } else {
                                resolve({ stdout: stdoutOutput, stderr: stderrOutput });
                            }
                        } catch (err) {
                            reject(err);
                        }
                    });
                });
        }
    }

    public async getContainerFile(context: IActionContext, ref: string, path: string, token?: CancellationToken): Promise<Buffer> {
        const container = this.dockerodeClient.getContainer(ref);

        const archiveStream = await this.callWithErrorHandling(context, async () => container.getArchive({ path }));

        return await new Promise(
            (resolve, reject) => {
                let entry: { content?: Buffer, error?: Error };

                const tarStream = tarstream.extract();

                tarStream.on('entry', (header, entryStream, next) => {
                    if (entry) {
                        //
                        // We already extracted the first entry, so just skip the rest...
                        //

                        // When the entry stream has been drained, go on to the next entry...
                        entryStream.on('end', next);

                        // Drain the entry stream...
                        entryStream.resume();
                    } else {
                        //
                        // This is the first entry, so extract its content...
                        //

                        const chunks: Buffer[] = [];

                        entryStream.on('data', chunk => {
                            chunks.push(chunk);
                        });

                        entryStream.on('error', error => {
                            entry = { error };
                        });

                        entryStream.on('end', () => {
                            entry = { content: Buffer.concat(chunks) };

                            // The entry stream is done, so go on to the next entry...
                            next();
                        });
                    }
                });

                tarStream.on('finish', () => {
                    //
                    // The archive has been extracted, so return the result...
                    //

                    if (entry.error) {
                        reject(entry.error);
                    } else if (entry.content) {
                        resolve(entry.content);
                    } else {
                        reject(new Error(localize('vscode-docker.utils.dockerode.failedToExtractContainerFile', 'Failed to extract container file from archive.')));
                    }
                });

                archiveStream.pipe(tarStream);
            });
    }

    public async putContainerFile(context: IActionContext, ref: string, path: string, content: Buffer, token?: CancellationToken): Promise<void> {
        const container = this.dockerodeClient.getContainer(ref);

        const directory = nodepath.dirname(path);
        const filename = nodepath.basename(path);

        const pack = tarstream.pack();

        pack.entry({ name: filename }, content);

        pack.finalize();

        await this.callWithErrorHandling(context, async () => container.putArchive(pack, { path: directory }));
    }

    public async getContainerLogs(context: IActionContext, ref: string, token?: CancellationToken): Promise<NodeJS.ReadableStream> {
        const container = this.dockerodeClient.getContainer(ref);
        return this.callWithErrorHandling(context, async () => container.logs({ follow: true, stdout: true }));
    }

    public async pruneContainers(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.pruneContainers(), token);
        return {
            SpaceReclaimed: result.SpaceReclaimed ?? 0,
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

    public async getImages(context: IActionContext, includeDangling: boolean = false, token?: CancellationToken): Promise<DockerImage[]> {
        const filters = {};
        if (!includeDangling) {
            filters['dangling'] = ['false'];
        }
        const images = await this.callWithErrorHandling(context, async () => this.dockerodeClient.listImages({ filters: JSON.stringify(filters) }), token);
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

        // Sorely missing in the inspect result for an image is the containers using it, so we will add that in, in the same-ish shape as networks' inspect result
        const containersUsingImage = await this.callWithErrorHandling(context, async () => this.dockerodeClient.listContainers({ filters: { 'ancestor': [result.Id] }, all: true }));

        const containersObject: ImageInspectionContainers = {};
        for (const container of containersUsingImage) {
            containersObject[container.Id] = { Name: getContainerName(container) };
        }

        return {
            ...result,
            CreatedTime: new Date(result.Created).valueOf(),
            Name: undefined, // Not needed on inspect info
            Containers: containersObject,
        };
    }

    public async pruneImages(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.pruneImages(), token);
        return {
            SpaceReclaimed: result.SpaceReclaimed ?? 0,
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
                Driver: ni.Driver as DriverType,
                CreatedTime: new Date(ni.Created).valueOf(),
            };
        });
    }

    public async inspectNetwork(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerNetworkInspection> {
        const network = this.dockerodeClient.getNetwork(ref);
        const result = await this.callWithErrorHandling(context, async () => network.inspect(), token);

        return {
            ...result,
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                CreatedTime: new Date((vi as any).CreatedAt).valueOf(),
                Id: undefined, // Not defined for volumes
            };
        });
    }

    public async inspectVolume(context: IActionContext, ref: string, token?: CancellationToken): Promise<DockerVolumeInspection> {
        const volume = this.dockerodeClient.getVolume(ref);
        const result = await this.callWithErrorHandling(context, async () => volume.inspect(), token);

        // Sorely missing in the inspect result for a volume is the containers using it, so we will add that in, in the same-ish shape as networks' inspect result
        const containersUsingVolume = await this.callWithErrorHandling(context, async () => this.dockerodeClient.listContainers({ filters: { 'volume': [ref] } }));

        const containersObject: VolumeInspectionContainers = {};
        for (const container of containersUsingVolume) {
            const destination = container.Mounts?.find(m => m.Name === volume.name)?.Destination;
            containersObject[container.Id] = { Name: getContainerName(container), Destination: destination || localize('vscode-docker.utils.dockerode.unknownDestination', '<Unknown>') };
        }

        return {
            ...result,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            CreatedTime: new Date((result as any).CreatedAt).valueOf(),
            Id: undefined, // Not defined for volumes
            Containers: containersObject,
        };
    }

    public async pruneVolumes(context: IActionContext, token?: CancellationToken): Promise<PruneResult> {
        const result = await this.callWithErrorHandling(context, async () => this.dockerodeClient.pruneVolumes(), token);
        return {
            SpaceReclaimed: result.SpaceReclaimed ?? 0,
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
