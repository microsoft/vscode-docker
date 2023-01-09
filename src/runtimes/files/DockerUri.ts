/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerOS } from '../docker';
import * as corepath from 'path';
import * as vscode from 'vscode';

export type DockerUriQuery = {
    containerOS?: ContainerOS;
    fileType?: vscode.FileType;
    mode?: number;
    ctime?: number;
    mtime?: number;
    atime?: number;
    size?: number;
};

export class DockerUri {

    public static create(containerId: string, path: string, options?: DockerUriQuery): DockerUri {
        return new DockerUri(containerId, path, options);
    }

    public static parse(uri: vscode.Uri): DockerUri {
        const containerId = uri.authority;
        const path = uri.path;
        const query = queryFromURLSearchParams(new URLSearchParams(uri.query));

        return DockerUri.create(containerId, path, query);
    }

    public static joinPath(baseUri: DockerUri, ...pathSegments: string[]): DockerUri {
        return baseUri.with({
            path: corepath.posix.join(baseUri.path, ...pathSegments)
        });
    }

    public with(options: DockerUriQuery & {
        containerId?: string,
        path?: string
    }): DockerUri {
        return DockerUri.create(
            options.containerId ?? this.containerId,
            options.path ?? this.path,
            { ...this.options, ...options }
        );
    }

    public get uri(): vscode.Uri {
        const uri = vscode.Uri.parse('docker:///')
            .with({
                authority: this.containerId,
                path: this.path
            });

        return this.options
            ? uri.with({ query: queryToURLSearchParams(this.options).toString() })
            : uri;
    }

    public get windowsPath(): string {
        return corepath.win32.resolve(this.path);
    }

    private constructor(public readonly containerId: string, public readonly path: string, public readonly options?: DockerUriQuery) {
    }
}

function queryToURLSearchParams(query: DockerUriQuery): URLSearchParams {
    const queryStringRecord: Record<string, string> = {};

    for (const key of Object.keys(query)) {
        queryStringRecord[key] = query[key].toString();
    }

    return new URLSearchParams(queryStringRecord);
}

function queryFromURLSearchParams(queryParams: URLSearchParams): DockerUriQuery {
    return {
        containerOS: queryParams.get('containerOS') as ContainerOS || 'linux',
        fileType: Number.parseInt(queryParams.get('fileType')) as vscode.FileType || vscode.FileType.File,
        mode: Number.parseInt(queryParams.get('mode')) || undefined,
        ctime: Number.parseInt(queryParams.get('ctime')) || undefined,
        mtime: Number.parseInt(queryParams.get('mtime')) || undefined,
        atime: Number.parseInt(queryParams.get('atime')) || undefined,
        size: Number.parseInt(queryParams.get('size')) || 0,
    };
}
