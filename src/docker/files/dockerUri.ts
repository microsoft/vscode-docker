import * as corepath from 'path';
import * as querystring from 'querystring';
import * as vscode from 'vscode';

export type DockerUriFileType = 'directory' | 'file';

export type DockerUriQuery = {
    fileType?: DockerUriFileType;
};

export class DockerUri {

    public static create(containerId: string, path: string, fileType?: DockerUriFileType): DockerUri {
        return new DockerUri(containerId, path, fileType);
    }

    public static parse(uri: vscode.Uri): DockerUri {
        const containerId = uri.authority;
        const path = uri.path;

        const query = <DockerUriQuery>querystring.decode(uri.query);

        return DockerUri.create(containerId, path, query?.fileType);
    }

    public static joinPath(baseUri: DockerUri, ...pathSegments: string[]): DockerUri {
        const joinedPath = corepath.posix.join(baseUri.path, ...pathSegments);

        return DockerUri.create(baseUri.containerId, joinedPath, baseUri.fileType);
    }

    public with(options: {
        containerId?: string,
        fileType?: DockerUriFileType,
        path?: string
    }): DockerUri {
        return DockerUri.create(
            options.containerId ?? this.containerId,
            options.path ?? this.path,
            options.fileType ?? this.fileType
        );
    }

    public get uri(): vscode.Uri {
        const uri = vscode.Uri.parse('docker:///')
            .with({
                authority: this.containerId,
                path: this.path
            });

        return this.fileType
            ? uri.with({ query: querystring.encode({ fileType: this.fileType })})
            : uri;
    }

    private constructor(public readonly containerId: string, public readonly path: string, public readonly fileType?: DockerUriFileType) {
    }
}
