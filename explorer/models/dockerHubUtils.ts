import * as vscode from 'vscode';
import * as keytarType from 'keytar';
import * as opn from 'opn';
import request = require('request-promise');
import { DockerHubRepositoryNode, DockerHubImageNode, DockerHubOrgNode } from './dockerHubNodes';

let _token: Token;

export interface Token {
    token: string
};

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
};

export interface Repository {
    namespace: string
    name: string
};

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

export function dockerHubLogout(): void {

    const keytar: typeof keytarType = require(`${vscode.env.appRoot}/node_modules/keytar`);
    if (keytar) {
        keytar.deletePassword('vscode-docker', 'dockerhub.token');
        keytar.deletePassword('vscode-docker', 'dockerhub.password');
        keytar.deletePassword('vscode-docker', 'dockerhub.username');
    }
    _token = null;
}

export async function dockerHubLogin(): Promise<{ username: string, password: string, token: string }> {

    const username: string = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Username' });
    if (username) {
        const password: string = await vscode.window.showInputBox({ ignoreFocusOut: true, prompt: 'Password', password: true });
        if (password) {
            _token = await login(username, password);
            if (_token) {
                return { username: username, password: password, token: <string>_token.token };
            }
        }
    }

    return;

}

export function setDockerHubToken(token: string) {
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
        t = await request(options);
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
        u = await request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Docker: Unable to retrieve User information');
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
        repos = await request(options);
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
        res = await request(options);
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
        uri: `https://hub.docker.com/v2/repositories/${repository.namespace}/${repository.name}/tags?page_size=100&page=1`,
        headers: {
            Authorization: 'JWT ' + _token.token
        },
        json: true
    }

    try {
        tagsPage = await request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Docker: Unable to retrieve Repository Tags');
    }

    return <Tag[]>tagsPage.results;

}

export function browseDockerHub(context?: DockerHubImageNode | DockerHubRepositoryNode | DockerHubOrgNode) {

    if (context) {
        let url: string = 'https://hub.docker.com/';
        const repo: RepositoryInfo = context.repository;
        switch (context.contextValue) {
            case 'dockerHubNamespace':
                url = `${url}u/${context.userName}`;
                break;
            case 'dockerHubRepository':
                url = `${url}r/${context.repository.namespace}/${context.repository.name}`;
                break;
            case 'dockerHubImageTag':
                url = `${url}r/${context.repository.namespace}/${context.repository.name}/tags`;
                break;
        }
        opn(url);
    }
}