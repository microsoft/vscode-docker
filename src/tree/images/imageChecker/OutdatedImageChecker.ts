/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ociClientId } from '../../../constants';
import { DockerImage } from '../../../docker/Images';
import { ext } from '../../../extensionVariables';
import { httpRequest, RequestOptionsLike } from '../../../utils/httpRequest';
import { getImagePropertyValue } from '../ImageProperties';
import { DatedDockerImage } from '../ImagesTreeItem';
import { ImageRegistry, registries } from './registries';

const noneRegex = /<none>/i;

export class OutdatedImageChecker {
    private shouldLoad: boolean;
    private readonly outdatedImageIds: string[] = [];
    private readonly defaultRequestOptions: RequestOptionsLike;

    public constructor() {
        const dockerConfig = vscode.workspace.getConfiguration('docker');
        this.shouldLoad = dockerConfig.get('images.checkForOutdatedImages');

        this.defaultRequestOptions = {
            method: 'HEAD',
            headers: {
                'X-Meta-Source-Client': ociClientId,
                'Accept': 'application/vnd.docker.distribution.manifest.list.v2+json',
            },
        };
    }

    public markOutdatedImages(images: DatedDockerImage[]): void {
        if (this.shouldLoad) {
            this.shouldLoad = false;

            // Don't wait
            void callWithTelemetryAndErrorHandling('outdatedImageCheck', async (context: IActionContext) => {
                context.telemetry.properties.isActivationEvent = 'true';
                context.errorHandling.suppressReportIssue = true;
                context.errorHandling.suppressDisplay = true;

                // Do a live check
                context.telemetry.properties.checkSource = 'live';

                const imageCheckPromises: Promise<void>[] = [];

                for (const image of images) {
                    const imageRegistry = getImagePropertyValue(image, 'Registry');
                    const matchingRegistry = registries.find(r => r.registryMatch.test(imageRegistry));

                    if (matchingRegistry) {
                        imageCheckPromises.push((async () => {
                            if (await this.checkImage(context, matchingRegistry, image) === 'outdated') {
                                this.outdatedImageIds.push(image.Id);
                            }
                        })());
                    }
                }

                context.telemetry.measurements.imagesChecked = imageCheckPromises.length;

                // Load the data for all images then force the tree to refresh
                await Promise.all(imageCheckPromises);

                context.telemetry.measurements.outdatedImages = this.outdatedImageIds.length;

                // Don't wait
                void ext.imagesRoot.refresh(context);
            });
        }

        for (const image of images) {
            image.Outdated = this.outdatedImageIds.some(i => i.toLowerCase() === image.Id.toLowerCase());
        }
    }

    private async checkImage(context: IActionContext, registry: ImageRegistry, image: DockerImage): Promise<'latest' | 'outdated' | 'unknown'> {
        try {
            const [registryAndRepo, tag] = image.Name.split(':');
            // Remove the registry and leading/trailing slashes from the registryAndRepo to get the repo
            const repo = registryAndRepo.replace(registry.registryMatch, '').replace(/^\/|\/$/, '');

            if (noneRegex.test(repo) || noneRegex.test(tag)) {
                return 'unknown';
            }

            // 0. If there's a method to sign the request, it will be called on the registry
            // 1. Get the latest image digest ID from the manifest
            const latestImageDigest = await this.getLatestImageDigest(registry, repo, tag);

            // 2. Compare it with the current image's value
            const imageInspectInfo = await ext.dockerClient.inspectImage(context, image.Id);

            // 3. If some local digest matches the most up-to-date digest, then what we have is up-to-date
            //    The logic is reversed so that if something goes wrong, we will err toward calling it up-to-date
            if (imageInspectInfo?.RepoDigests?.every(digest => digest?.toLowerCase()?.indexOf(latestImageDigest.toLowerCase()) < 0)) {
                return 'outdated';
            }

            return 'latest';
        } catch { // Errors are expected, e.g. all untagged local images are treated as if they are in docker.io/library, but will 404 when queried
            return 'unknown';
        }
    }

    private async getLatestImageDigest(registry: ImageRegistry, repo: string, tag: string): Promise<string> {
        const manifestResponse = await httpRequest(`${registry.baseUrl}/${repo}/manifests/${tag}`, this.defaultRequestOptions, async (request) => {
            if (registry.signRequest) {
                return registry.signRequest(request, `repository:library/${repo}:pull`);
            }

            return request;
        });

        return manifestResponse.headers['docker-content-digest'];
    }
}
