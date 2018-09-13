/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
// tslint:disable-next-line:no-require-imports
import * as opn from 'opn';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { keytarConstants, PAGE_SIZE } from '../../constants';
import { ext } from '../../extensionVariables';
import { wrapError } from '../../helpers/wrapError';
import { Repository } from '../../utils/Azure/models/repository';
import { DockerHubImageTagNode, DockerHubOrgNode, DockerHubRepositoryNode } from '../models/dockerHubNodes';
import { NodeBase } from '../models/nodeBase';

let _token: Token | undefined;

export interface Token {
    token: string
}

export interface User {
    company: string
    date_joined: string
    full_name: string
    gravatar_email: string
    gravatar_url: string
    id: string
    is_admin: boolean
    is_staff: boolean
    location: string
    profile_url: string
    type: string
    username: string
}

export interface Repository {
    namespace: string
    name: string
}

export interface RepositoryInfo {
    user: string
    name: string
    namespace: string
    repository_type: string
    status: number
    description: string
    is_private: boolean
    is_automated: boolean
    can_edit: boolean
    star_count: number
    pull_count: number
    last_updated: string
    //build_on_cloud: any
    has_starred: boolean
    full_description: string
    affiliation: string
    permissions: {
        read: boolean
        write: boolean
        admin: boolean
    }
}

export interface Tag {
    creator: number
    full_size: number
    id: number
    image_id: string
    images: Image[]
    last_updated: string
    last_updater: number
    name: string
    repository: number
    v2: boolean
}

export interface Image {
    architecture: string
    //features: any
    os: string
    //os_features: any
    //os_version: any
    size: number
    //variant: any
}

export interface ManifestFsLayer {
    blobSum: string;
}

export interface ManifestHistory {
    v1Compatibility: string; // stringified ManifestHistoryV1Compatibility
}

export interface ManifestHistoryV1Compatibility {
    created: string;
}

export interface Manifest {
    name: string;
    tag: string;
    architecture: string;
    fsLayers: ManifestFsLayer[];
    history: ManifestHistory[];
    schemaVersion: number;
}

export async function dockerHubLogout(): Promise<void> {
    if (ext.keytar) {
        await ext.keytar.deletePassword(keytarConstants.serviceId, keytarConstants.dockerHubTokenKey);
        await ext.keytar.deletePassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey);
        await ext.keytar.deletePassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey);
    }
    _token = undefined;
}

export async function dockerHubLogin(): Promise<{ username: string, password: string, token: string }> {
    const username: string = await ext.ui.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter your Docker ID to log in to Docker Hub' });
    const password: string = await ext.ui.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter your Docker Hub password', password: true });
    _token = await login(username, password);
    return { username: username, password: password, token: <string>_token.token };
}

export function setDockerHubToken(token: string): void {
    _token = { token: token };
}

function getToken(): Token {
    if (!_token) {
        throw new Error('You must log in to Docker Hub first');
    }

    return _token;
}

async function login(username: string, password: string): Promise<Token> {
    let options = {
        method: 'POST',
        uri: 'https://hub.docker.com/v2/users/login',
        body: {
            username: username,
            password: password
        },
        json: true
    }

    return <Token>await ext.request(options);
}

export async function getUser(): Promise<User> {
    let options = {
        method: 'GET',
        uri: 'https://hub.docker.com/v2/user/',
        headers: {
            Authorization: 'JWT ' + getToken().token
        },
        json: true
    }

    try {
        return <User>await ext.request(options);
    } catch (err) {
        let error = <{ statusCode?: number }>err;
        if (error.statusCode === 401) {
            throw wrapError('Docker: Please log out of Docker Hub and then log in again.', error);
        }

        throw err;
    }
}

export async function getRepositories(username: string): Promise<Repository[]> {
    let options = {
        method: 'GET',
        uri: `https://hub.docker.com/v2/users/${username}/repositories/`,
        headers: {
            Authorization: 'JWT ' + getToken().token
        },
        json: true
    }

    try {
        return <Repository[]>await ext.request(options);
    } catch (error) {
        throw wrapError('Docker: Unable to retrieve Repositories', error);
    }
}

export async function getRepositoryInfo(repository: Repository): Promise<RepositoryInfo> {
    let options = {
        method: 'GET',
        uri: `https://hub.docker.com/v2/repositories/${repository.namespace}/${repository.name}/`,
        headers: {
            Authorization: 'JWT ' + getToken().token
        },
        json: true
    }

    try {
        return <RepositoryInfo>await ext.request(options);
    } catch (error) {
        throw wrapError('Docker: Unable to get Repository Details', error);
    }
}

export async function getRepositoryTags(repository: Repository): Promise<Tag[]> {
    let options = {
        method: 'GET',
        uri: `https://hub.docker.com/v2/repositories/${repository.namespace}/${repository.name}/tags?page_size=${PAGE_SIZE}&page=1`,
        headers: {
            Authorization: 'JWT ' + getToken().token
        },
        json: true
    }

    try {
        let tagsPage = <{ results: Tag[] }>await ext.request(options);
        return <Tag[]>tagsPage.results;
    } catch (error) {
        throw wrapError('Docker: Unable to retrieve Repository Tags', error);
    }
}

export function browseDockerHub(node?: DockerHubImageTagNode | DockerHubRepositoryNode | DockerHubOrgNode): void {
    if (node) {
        let url: string = 'https://hub.docker.com/';
        if (node instanceof DockerHubOrgNode) {
            url = `${url}u/${node.userName}`;
        } else if (node instanceof DockerHubRepositoryNode) {
            url = `${url}r/${node.repository.namespace}/${node.repository.name}`;
        } else if (node instanceof DockerHubImageTagNode) {
            url = `${url}r/${node.repository.namespace}/${node.repository.name}/tags`;
        } else {
            assert(false, `browseDockerHub: Unexpected node type, contextValue=${(<NodeBase>node).contextValue}`)
        }

        // tslint:disable-next-line:no-unsafe-any
        opn(url);
    }
}
