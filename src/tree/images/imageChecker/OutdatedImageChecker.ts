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
import { localize } from '../../../localize';
import { getImagePropertyValue } from '../ImageProperties';
import { DatedDockerImage } from '../ImagesTreeItem';
import { ImageRegistry, registries } from './registries';

const noneRegex = /<none>/i;

const lastLiveOutdatedCheckKey = 'vscode-docker.outdatedImageChecker.lastLiveCheck';
const outdatedImagesKey = 'vscode-docker.outdatedImageChecker.outdatedImages';

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
            method: 'GET',
            json: true,
            resolveWithFullResponse: true,
            strictSSL: strictSSL,
            headers: {
                'X-Meta-Source-Client': ociClientId,
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

                const lastCheck = ext.context.globalState.get<number | undefined>(lastLiveOutdatedCheckKey, undefined);

                if (lastCheck && Date.now() - lastCheck < 24 * 60 * 60 * 1000) {
                    // Use the cached data
                    context.telemetry.properties.checkSource = 'cache';
                    this.outdatedImageIds.push(...ext.context.globalState.get<string[]>(outdatedImagesKey, []));
                } else {
                    // Do a live check
                    context.telemetry.properties.checkSource = 'live';
                    await ext.context.globalState.update(lastLiveOutdatedCheckKey, Date.now());

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
                    await ext.context.globalState.update(outdatedImagesKey, this.outdatedImageIds);

                    context.telemetry.measurements.outdatedImages = this.outdatedImageIds.length;

                    // Don't wait
                    void ext.imagesRoot.refresh(context);
                }
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
                return 'outdated';
            }

            let token: string | undefined;

            // 1. Get an OAuth token to access the resource. No Authorization header is required for public scopes.
            if (registry.getToken) {
                token = await registry.getToken(this.defaultRequestOptions, `repository:library/${repo}:pull`);
            }

            // 2. Get the latest image ID from the manifest
            const latestConfigImageId = await this.getLatestConfigImageId(registry, repo, tag, token);

            // 3. Compare it with the current image's value
            const imageInspectInfo = await ext.dockerClient.inspectImage(context, image.Id);

            if (latestConfigImageId.toLowerCase() !== imageInspectInfo?.Config?.Image?.toLowerCase()) {
                return 'outdated';
            }

            return 'latest';
        } catch { // Errors are expected, e.g. all untagged local images are treated as if they are in docker.io/library, but will 404 when queried
            return 'unknown';
        }
    }

    private async getLatestConfigImageId(registry: ImageRegistry, repo: string, tag: string, oAuthToken: string | undefined): Promise<string> {
        const manifestOptions: request.RequestPromiseOptions = {
            ...this.defaultRequestOptions,
            auth: oAuthToken ? {
                bearer: oAuthToken,
            } : undefined,
        };

        const manifestResponse = await request(`${registry.baseUrl}/${repo}/manifests/${tag}`, manifestOptions) as Response;
        /* eslint-disable @typescript-eslint/tslint/config */
        const firstHistory = JSON.parse(manifestResponse?.body?.history?.[0]?.v1Compatibility);
        const latestConfigImageId: string = firstHistory?.config?.Image;
        /* eslint-enable @typescript-eslint/tslint/config */

        if (!latestConfigImageId) {
            throw new Error(localize('vscode-docker.outdatedImageChecker.noManifest', 'Failed to acquire manifest token for image: \'{0}:{1}\'', repo, tag));
        }

        return latestConfigImageId;
    }
}
