/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Response } from 'request';
import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { DockerImage } from '../../docker/Images';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { AsyncLazy, Lazy } from '../../utils/lazy';
import { IOAuthContext } from '../registries/auth/IAuthProvider';
import { getWwwAuthenticateContext } from '../registries/auth/oAuthUtils';
import { getImagePropertyValue } from './ImageProperties';
import { DatedDockerImage } from './ImagesTreeItem';

const noneRegex = /<none>/i;

export class OutdatedImageChecker {
    private shouldLoad: boolean;
    private readonly outdatedImageIds: string[] = [];
    private readonly authContext: AsyncLazy<IOAuthContext>;
    private readonly defaultRequestOptions: Lazy<request.RequestPromiseOptions>;

    public constructor() {
        const dockerConfig = vscode.workspace.getConfiguration('docker');
        this.shouldLoad = dockerConfig.get('images.checkForOutdatedImages');

        this.defaultRequestOptions = new Lazy(() => this.getRequestOptions());
        this.authContext = new AsyncLazy(async () => this.getAuthContext());
    }

    public markOutdatedImages(images: DatedDockerImage[]): void {
        if (this.shouldLoad) {
            this.shouldLoad = false;

            // Don't wait
            void callWithTelemetryAndErrorHandling('outdatedImageCheck', async (context: IActionContext) => {
                context.telemetry.properties.isActivationEvent = 'true';
                context.errorHandling.suppressReportIssue = true;
                context.errorHandling.suppressDisplay = true;

                const imageCheckPromises = images
                    .filter(image => {
                        // Only include images that are potentially in docker.io/library (no private or other public registries are supported)
                        return /docker[.]io\/library/i.test(getImagePropertyValue(image, 'Registry'));
                    })
                    .map(async (image) => {
                        if (await this.checkImage(context, image) === 'outdated') {
                            this.outdatedImageIds.push(image.Id);
                        }
                    });

                context.telemetry.measurements.imagesChecked = imageCheckPromises.length;

                // Load the data for all images then force the tree to refresh
                await Promise.all(imageCheckPromises);

                context.telemetry.measurements.outdatedImages = this.outdatedImageIds.length;

                // Don't wait
                void ext.imagesRoot.refresh();
            });
        }

        for (const image of images) {
            image.Outdated = this.outdatedImageIds.some(i => i.toLowerCase() === image.Id.toLowerCase());
        }
    }

    private async checkImage(context: IActionContext, image: DockerImage): Promise<'latest' | 'outdated' | 'unknown'> {
        try {
            const [repo, tag] = image.Name.split(':');

            if (noneRegex.test(repo) || noneRegex.test(tag)) {
                return 'outdated';
            }

            // 1. Get an OAuth token to access the resource. No Authorization header is required for public scopes.
            const token = await this.getToken(`repository:library/${repo}:pull`);

            // 2. Get the latest image ID from the manifest
            const latestConfigImageId = await this.getLatestConfigImageId(repo, tag, token);

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

    private async getToken(scope: string): Promise<string> {
        const authContext = {
            ...await this.authContext.getValue(),
            scope: scope,
        };

        const authOptions: request.RequestPromiseOptions = {
            ...this.defaultRequestOptions.value,
            qs: {
                service: authContext.service,
                scope: authContext.scope,
            },
        };

        const tokenResponse = await request(authContext.realm.toString(), authOptions) as Response;
        // eslint-disable-next-line @typescript-eslint/tslint/config
        const token: string = tokenResponse?.body?.token;

        if (!token) {
            throw new Error(localize('vscode-docker.outdatedImageChecker.noToken', 'Failed to acquire OAuth token for scope: \'{0}\'', scope));
        }

        return token;
    }

    private async getLatestConfigImageId(repo: string, tag: string, oAuthToken: string): Promise<string> {
        const manifestOptions: request.RequestPromiseOptions = {
            ...this.defaultRequestOptions.value,
            auth: {
                bearer: oAuthToken,
            },
        };

        const manifestResponse = await request(`https://registry-1.docker.io/v2/library/${repo}/manifests/${tag}`, manifestOptions) as Response;
        /* eslint-disable @typescript-eslint/tslint/config */
        const firstHistory = JSON.parse(manifestResponse?.body?.history?.[0]?.v1Compatibility);
        const latestConfigImageId: string = firstHistory?.config?.Image;
        /* eslint-enable @typescript-eslint/tslint/config */

        if (!latestConfigImageId) {
            throw new Error(localize('vscode-docker.outdatedImageChecker.noManifest', 'Failed to acquire manifest token for image: \'{0}:{1}\'', repo, tag));
        }

        return latestConfigImageId;
    }

    private async getAuthContext(): Promise<IOAuthContext> {
        try {
            const options = this.defaultRequestOptions.value;
            await request('https://registry-1.docker.io/v2/', options);
        } catch (err) {
            const result = getWwwAuthenticateContext(err);

            if (!result) {
                throw err;
            }

            return result;
        }
    }

    private getRequestOptions(): request.RequestPromiseOptions {
        const httpSettings = vscode.workspace.getConfiguration('http');
        const strictSSL = httpSettings.get<boolean>('proxyStrictSSL', true);
        return {
            method: 'GET',
            json: true,
            resolveWithFullResponse: true,
            strictSSL: strictSSL
        };
    }
}
