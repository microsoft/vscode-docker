/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Response } from 'request';
import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { callDockerodeAsync } from '../../utils/callDockerode';
import { AsyncLazy, Lazy } from '../../utils/lazy';
import { IOAuthContext } from '../registries/auth/IAuthProvider';
import { getWwwAuthenticateContext } from '../registries/auth/oAuthUtils';
import { getImagePropertyValue } from './ImageProperties';
import { ILocalImageInfo } from './LocalImageInfo';

export class OutdatedImageChecker {
    private shouldLoad: boolean;
    private readonly outdatedImageIds: string[] = [];
    private readonly authContext: AsyncLazy<IOAuthContext>;
    private readonly defaultRequestOptions: Lazy<request.RequestPromiseOptions>;

    public constructor() {
        const dockerConfig = vscode.workspace.getConfiguration('docker');
        this.shouldLoad = dockerConfig.get('checkForOutdatedImages');

        this.defaultRequestOptions = new Lazy(() => this.getRequestOptions());
        this.authContext = new AsyncLazy(async () => this.getAuthContext());
    }

    public async markOutdatedImages(images: ILocalImageInfo[]): Promise<void> {
        if (this.shouldLoad) {
            this.shouldLoad = false;
            try {
                const imageCheckPromises = images
                    .filter(image => {
                        return /docker[.]io\/library/i.test(getImagePropertyValue(image, 'Registry'));
                    })
                    .map(async (image) => {
                        if (await this.checkImage(image) === 'outdated') {
                            this.outdatedImageIds.push(image.imageId);
                        }
                    });

                // Load the data for all images then force the tree to refresh
                // By then, this.shouldLoad will be false so this path won't happen again
                Promise.all(imageCheckPromises).then(() => { void ext.imagesRoot.refresh(); }, () => { });
            } catch { }
        }

        for (const image of images) {
            image.outdated = this.outdatedImageIds.some(i => i.toLowerCase() === image.imageId.toLowerCase());
        }
    }

    private async checkImage(image: ILocalImageInfo): Promise<'latest' | 'outdated' | 'unknown'> {
        try {
            const [repo, tag] = image.fullTag.split(':');

            // 1. Get an OAuth token to access the resource. No Authorization header is required for public scopes.
            const token = await this.getToken(`repository:library/${repo}:pull`);

            // 2. Get the latest image ID from the manifest
            const latestConfigImageId = await this.getLatestConfigImageId(repo, tag, token);

            // 3. Compare it with the current image's value
            const dockerodeImage = ext.dockerode.getImage(image.fullTag);
            const imageInspectInfo = await callDockerodeAsync(async () => dockerodeImage.inspect());

            if (latestConfigImageId.toLowerCase() !== imageInspectInfo.Config.Image.toLowerCase()) {
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
