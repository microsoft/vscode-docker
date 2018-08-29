/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as opn from 'opn';
import * as vscode from 'vscode';
import { keytarConstants, PAGE_SIZE } from '../../constants';
import { ext } from '../../extensionVariables';
import { DockerHubImageTagNode, DockerHubOrgNode, DockerHubRepositoryNode } from '../models/dockerHubNodes';
import { NodeBase } from '../models/nodeBase';

let _token: Token;

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
    build_on_cloud: any
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
    image_id: any
    images: Image[]
    last_updated: string
    last_updater: number
    name: string
    repository: number
    v2: boolean
}

export interface Image {
    architecture: string
    features: any
    os: string
    os_features: any
    os_version: any
    size: number
    variant: any
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
    _token = null;
}

export async function dockerHubLogin(): Promise<{ username: string, password: string, token: string }> {

    const username: string = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter your Docker ID to log in to Docker Hub' });
    if (username) {
        const password: string = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Please enter your Docker Hub password', password: true });
        if (password) {
            _token = await login(username, password);
            if (_token) {
                return { username: username, password: password, token: <string>_token.token };
            }
        }
    }

    return;
}

export function setDockerHubToken(token: string): void {
    _token = { token: token };
}

async function login(username: string, password: string): Promise<Token> {
    let t: Token;

    let options = {
        method: 'POST',
        uri: 'https://hub.docker.com/v2/users/login',
        body: {
            username: username,
            password: password
        },
        json: true
    }

    try {
        t = await ext.request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage(error.error.detail);
    }

    return t;
}

export async function getUser(): Promise<User> {
    let u: User;

    let options = {
        method: 'GET',
        uri: 'https://hub.docker.com/v2/user/',
        headers: {
            Authorization: 'JWT ' + _token.token
        },
        json: true
    }

    try {
        u = await ext.request(options);
    } catch (error) {
        console.log(error);
        if (error.statusCode === 401) {
            vscode.window.showErrorMessage('Docker: Please logout of DockerHub and then log in again.');
        }
    }

    return u;
}

export async function getRepositories(username: string): Promise<Repository[]> {
    let repos: Repository[];

    let options = {
        method: 'GET',
        uri: `https://hub.docker.com/v2/users/${username}/repositories/`,
        headers: {
            Authorization: 'JWT ' + _token.token
        },
        json: true
    }

    try {
        repos = await ext.request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Docker: Unable to retrieve Repositories');
    }

    return repos;
}

export async function getRepositoryInfo(repository: Repository): Promise<any> {

    let res: any;

    let options = {
        method: 'GET',
        uri: `https://hub.docker.com/v2/repositories/${repository.namespace}/${repository.name}/`,
        headers: {
            Authorization: 'JWT ' + _token.token
        },
        json: true
    }

    try {
        res = await ext.request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Docker: Unable to get Repository Details');
    }

    return res;
}

export async function getRepositoryTags(repository: Repository): Promise<Tag[]> {
    let tagsPage: any;

    let options = {
        method: 'GET',
        uri: `https://hub.docker.com/v2/repositories/${repository.namespace}/${repository.name}/tags?page_size=${PAGE_SIZE}&page=1`,
        headers: {
            Authorization: 'JWT ' + _token.token
        },
        json: true
    }

    try {
        tagsPage = await ext.request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Docker: Unable to retrieve Repository Tags');
    }

    return <Tag[]>tagsPage.results;
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
        opn(url);
    }
}
