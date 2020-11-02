/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DockerOSType } from '../Common';
import { DockerApiClient } from '../DockerApiClient';
import { DirectoryItem, DirectoryItemStat, DockerContainerExecutor, listLinuxContainerDirectory, listWindowsContainerDirectory, statLinuxContainerItem, statWindowsContainerItem } from './ContainerFilesUtils';
import { DockerUri } from './DockerUri';

export class ContainerFilesProvider implements vscode.FileSystemProvider {
    private readonly changeEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    public constructor(private readonly dockerClientProvider: () => DockerApiClient) {
    }

    public get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
        return this.changeEmitter.event;
    }

    public watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        throw new Error('Method not implemented.');
    }

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        const method = async (): Promise<vscode.FileStat> => {
            const dockerUri = DockerUri.parse(uri);

            const executor: DockerContainerExecutor =
                async (commands, user) => {
                    return await this.dockerClientProvider().execInContainer(/* context: */ undefined, dockerUri.containerId, commands, { user });
                };

            const containerOS = dockerUri.options?.containerOS ?? await this.getContainerOS(dockerUri.containerId);

            let statItem: DirectoryItemStat;

            switch (containerOS) {
                case 'linux':

                    statItem = await statLinuxContainerItem(executor, dockerUri.path);

                    break;

                case 'windows':

                    statItem = await statWindowsContainerItem(executor, dockerUri.windowsPath, dockerUri.options.fileType);

                    break;

                default:

                    throw new Error('Unsupported container OS.');
            }

            if (statItem) {
                return {
                    ctime: statItem.ctime,
                    mtime: statItem.mtime,
                    size: statItem.size,
                    type: statItem.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
                };
            }

            throw vscode.FileSystemError.FileNotFound(uri);
        };

        return method();
    }

    public readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        const method = async (): Promise <[string, vscode.FileType][]> => {
            const dockerUri = DockerUri.parse(uri);

            const executor: DockerContainerExecutor =
                async (commands, user) => {
                    return await this.dockerClientProvider().execInContainer(/* context: */ undefined, dockerUri.containerId, commands, { user });
                };

            let containerOS = dockerUri.options?.containerOS ?? await this.getContainerOS(dockerUri.containerId);

            let items: DirectoryItem[];

            switch (containerOS) {
                case 'linux': items = await listLinuxContainerDirectory(executor, dockerUri.path); break;
                case 'windows': items = await listWindowsContainerDirectory(executor, dockerUri.windowsPath); break;
                default:
                    throw new Error('Unrecognized OS type.');
            }

            return items.map(item => [item.name, item.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File])
        };

        return method();
    }

    public createDirectory(uri: vscode.Uri): void | Thenable<void> {
        throw new Error('Method not implemented.');
    }

    public readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        const method =
            async (): Promise<Uint8Array> => {
                const dockerUri = DockerUri.parse(uri);

                let serverOS = dockerUri.options?.serverOS;

                if (serverOS === undefined) {
                    const version = await this.dockerClientProvider().version(undefined);

                    serverOS = version.Os;
                }

                switch (serverOS) {
                    case 'linux':

                        return await this.readFileViaCopy(dockerUri);

                    default:

                        return await this.readFileViaExec(dockerUri);
                }
            };

        return method();
    }

    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented.');
    }

    public delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented.');
    }

    public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented.');
    }

    public copy?(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
        throw new Error('Method not implemented.');
    }

    private async getContainerOS(id: string): Promise<DockerOSType | undefined> {
        const result = await this.dockerClientProvider().inspectContainer(/* context */ undefined, id);

        return result.Platform
    }

    private async readFileViaCopy(dockerUri: DockerUri): Promise<Uint8Array> {
        let containerOS = dockerUri.options?.containerOS;

        if (containerOS === undefined) {
            containerOS = await this.getContainerOS(dockerUri.containerId);
        }

        const buffer = await this.dockerClientProvider().getContainerFile(
            undefined,
            dockerUri.containerId,
            containerOS === 'windows' ? dockerUri.windowsPath : dockerUri.path);

        return Uint8Array.from(buffer);
    }

    private async readFileViaExec(dockerUri: DockerUri): Promise<Uint8Array> {
        let containerOS = dockerUri.options?.containerOS;

        if (containerOS === undefined) {
            containerOS = await this.getContainerOS(dockerUri.containerId);
        }

        let command: string[];

        switch (containerOS) {
            case 'linux':

                command = ['/bin/sh', '-c', `"cat '${dockerUri.path}'"` ];

                break;

            case 'windows':

                command = ['cmd', '/C', `type "${dockerUri.windowsPath}"` ];

                break;

            default:

                throw new Error('Unrecognized container OS.');
        }

        // TODO: Check status code (for error)?
        const stdout = await this.dockerClientProvider().execInContainer(undefined, dockerUri.containerId, command);
        const buffer = Buffer.from(stdout, 'utf8');

        return Uint8Array.from(buffer);
    }


    //     TODO: Do we need this and/or the fileType option in DockerUri?
    // private static toVsCodeFileType(fileType: DockerUriFileType): vscode.FileType {
    //     switch (fileType) {
    //         case 'directory': return vscode.FileType.Directory;
    //         case 'file': return vscode.FileType.File;
    //         default:

    //             return vscode.FileType.Unknown;
    //     }
    // }
}
