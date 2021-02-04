/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Response } from 'request';
import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ociClientId } from '../../../constants';
import { DockerImage } from '../../../docker/Images';
import { ext } from '../../../extensionVariables';
import { getImagePropertyValue } from '../ImageProperties';
import { DatedDockerImage } from '../ImagesTreeItem';
import { ImageRegistry, registries } from './registries';

const noneRegex = /<none>/i;

export class OutdatedImageChecker {
    private shouldLoad: boolean;
    private readonly outdatedImageIds: string[] = [];
    private readonly defaultRequestOptions: request.RequestPromiseOptions;

    public constructor() {
        const dockerConfig = vscode.workspace.getConfiguration('docker');
        this.shouldLoad = dockerConfig.get('images.checkForOutdatedImages');

        const httpSettings = vscode.workspace.getConfiguration('http');
        const strictSSL = httpSettings.get<boolean>('proxyStrictSSL', true);
        this.defaultRequestOptions = {
            method: 'HEAD',
            json: true,
            resolveWithFullResponse: true,
            strictSSL: strictSSL,
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

            let token: string | undefined;

            // 1. Get an OAuth token to access the resource. No Authorization header is required for public scopes.
            if (registry.getToken) {
                token = await registry.getToken({ ...this.defaultRequestOptions, method: 'GET' }, `repository:library/${repo}:pull`);
            }

            // 2. Get the latest image digest ID from the manifest
            const latestImageDigest = await this.getLatestImageDigest(registry, repo, tag, token);

            // 3. Compare it with the current image's value
            const imageInspectInfo = await ext.dockerClient.inspectImage(context, image.Id);

            if (imageInspectInfo?.RepoDigests?.[0]?.toLowerCase()?.indexOf(latestImageDigest.toLowerCase()) < 0) {
                return 'outdated';
            }

            return 'latest';
        } catch { // Errors are expected, e.g. all untagged local images are treated as if they are in docker.io/library, but will 404 when queried
            return 'unknown';
        }
    }

    private async getLatestImageDigest(registry: ImageRegistry, repo: string, tag: string, oAuthToken: string | undefined): Promise<string> {
        const manifestOptions: request.RequestPromiseOptions = {
            ...this.defaultRequestOptions,
            auth: oAuthToken ? {
                bearer: oAuthToken,
            } : undefined,
        };

        const manifestResponse = await request(`${registry.baseUrl}/${repo}/manifests/${tag}`, manifestOptions) as Response;
        return manifestResponse.headers['docker-content-digest'] as string;
    }
}
