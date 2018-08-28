/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as moment from 'moment';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { MAX_CONCURRENT_REQUESTS, PAGE_SIZE } from '../../constants'
import { ext } from '../../extensionVariables';
import { AsyncPool } from '../../utils/asyncpool';
import { Manifest, ManifestHistory, ManifestHistoryV1Compatibility, Repository } from '../utils/dockerHubUtils';

interface RegistryNonsensitiveInfo {
    url: string,
}

export interface RegistryCredentials {
    bearer?: string;
    userName?: string;
    password?: string;
}

export interface RegistryInfo extends RegistryNonsensitiveInfo {
    credentials: RegistryCredentials;
}

export interface TagInfo {
    repositoryName: string;
    tag: string;
    created: Date;
}

export async function registryRequest<T>(
    registryUrl: string,
    relativeUrl: string,
    credentials: RegistryCredentials
): Promise<T> {
    let httpSettings = vscode.workspace.getConfiguration('http');
    let strictSSL = httpSettings.get<boolean>('proxyStrictSSL', true);

    let response = await ext.request.get(
        `${registryUrl}/${relativeUrl}`,
        {
            json: true,
            resolveWithFullResponse: false,
            strictSSL: strictSSL,
            auth: {
                bearer: credentials.bearer,
                user: credentials.userName,
                pass: credentials.password
            }
        });
    return <T>response;
}

export async function getCatalog(registryUrl: string, credentials?: RegistryCredentials): Promise<string[]> {
    // Note: Note that the contents of the response are specific to the registry implementation. Some registries may opt to provide a full
    //   catalog output, limit it based on the user’s access level or omit upstream results, if providing mirroring functionality.
    //   (https://docs.docker.com/registry/spec/api/#listing-repositories)
    // Azure and private registries just return the repository names
    let response = await registryRequest<{ repositories: string[] }>(registryUrl, 'v2/_catalog', credentials);
    return response.repositories;
}

export async function getTags(registryUrl: string, repositoryName: string, credentials?: RegistryCredentials): Promise<TagInfo[]> {
    let result = await registryRequest<{ tags: string[] }>(registryUrl, `v2/${repositoryName}/tags/list?page_size=${PAGE_SIZE}&page=1`, credentials);
    let tags = result.tags;
    let tagInfos: TagInfo[] = [];

    //Acquires each image's manifest (in parallel) to acquire build time
    const pool = new AsyncPool(MAX_CONCURRENT_REQUESTS);
    for (let tag of tags) {
        pool.addTask(async (): Promise<void> => {
            try {
                let manifest: Manifest = await registryRequest<Manifest>(registryUrl, `v2/${repositoryName}/manifests/${tag}`, credentials);
                let history: ManifestHistoryV1Compatibility = JSON.parse(manifest.history[0].v1Compatibility);
                let created = new Date(history.created);
                let info = <TagInfo>{
                    tag: tag,
                    created
                };
                tagInfos.push(info);
            } catch (error) {
                vscode.window.showErrorMessage(parseError(error).message);
            }
        });
    }

    await pool.runAll();

    tagInfos.sort(compareTagsReverse);
    return tagInfos;
}

function compareTagsReverse(a: TagInfo, b: TagInfo): number {
    if (a.created < b.created) {
        return 1;
    } else if (a.created > b.created) {
        return -1;
    } else {
        return 0;
    }
}

export function formatTag(tag: string, created: Date): string {
    let displayName = `${tag} (${moment(created).fromNow()})`;
    return displayName;
}
