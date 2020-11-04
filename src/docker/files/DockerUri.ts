/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as corepath from 'path';
import * as querystring from 'querystring';
import * as vscode from 'vscode';
import { DockerOSType } from '../Common';

export type DockerUriFileType = 'directory' | 'file';

export type DockerUriQuery = {
    containerOS?: DockerOSType;
    fileType?: DockerUriFileType;
    serverOS?: DockerOSType;
};

export class DockerUri {

    public static create(containerId: string, path: string, options?: DockerUriQuery): DockerUri {
        return new DockerUri(containerId, path, options);
    }

    public static parse(uri: vscode.Uri): DockerUri {
        const containerId = uri.authority;
        const path = uri.path;

        const query = <DockerUriQuery>querystring.decode(uri.query);

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
            ? uri.with({ query: querystring.encode(this.options)})
            : uri;
    }

    public get windowsPath(): string {
        if (this.path.startsWith('/')) {
            return corepath.win32.join('C:\\', this.path.substr(1));
        }

        return this.path;
    }

    private constructor(public readonly containerId: string, public readonly path: string, public readonly options?: DockerUriQuery) {
    }
}
