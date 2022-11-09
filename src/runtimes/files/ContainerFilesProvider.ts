/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { DockerUri } from './DockerUri';
import { getDockerOSType } from '../../utils/osUtils';
import { AccumulatorStream, CommandNotSupportedError, DisposableLike, ListFilesItem } from '../docker';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { tarPackStream, tarUnpackStream } from '../../utils/tarUtils';

class MethodNotImplementedError extends CommandNotSupportedError {
    public constructor() {
        super(localize('docker.files.containerFilesProvider.methodNotImplemented', 'Method not implemented.'));
    }
}

export class ContainerFilesProvider extends vscode.Disposable implements vscode.FileSystemProvider {
    private readonly changeEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    public readonly onDidChangeFile = this.changeEmitter.event;

    public constructor() {
        super(() => {
            this.changeEmitter.dispose();
        });
    }

    public watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        // As we don't actually support watching files, just return a dummy subscription object...
        return DisposableLike.None;
    }

    public stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        const method = async (): Promise<vscode.FileStat> => {
            const dockerUri = DockerUri.parse(uri);

            return {
                ctime: dockerUri.options.ctime,
                mtime: dockerUri.options.mtime,
                size: dockerUri.options.size,
                type: dockerUri.options.fileType,
            };
        };

        return method();
    }

    public readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const method = async (): Promise<[string, vscode.FileType][]> => {
            const dockerUri = DockerUri.parse(uri);
            const containerOS = dockerUri.options?.containerOS || await getDockerOSType();

            const items: ListFilesItem[] = await ext.runWithDefaultShell(client =>
                client.listFiles({
                    container: dockerUri.containerId,
                    path: containerOS === 'windows' ? dockerUri.windowsPath : dockerUri.path,
                    operatingSystem: containerOS,
                })
            );

            return items.map(item => [item.name, item.type]);
        };

        return method();
    }

    public createDirectory(uri: vscode.Uri): void {
        throw new MethodNotImplementedError();
    }

    public readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const method =
            async (): Promise<Uint8Array> => {
                const dockerUri = DockerUri.parse(uri);
                const containerOS = dockerUri.options?.containerOS || await getDockerOSType();

                const accumulator = new AccumulatorStream();
                const targetStream = containerOS === 'windows' ? accumulator : tarUnpackStream(accumulator);

                const generator = ext.streamWithDefaultShell(
                    client => client.readFile({
                        container: dockerUri.containerId,
                        path: containerOS === 'windows' ? dockerUri.windowsPath : dockerUri.path,
                        operatingSystem: containerOS,
                    })
                );

                for await (const chunk of generator) {
                    targetStream.write(chunk);
                }

                return await accumulator.getBytes();
            };

        return method();
    }

    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
        const method =
            async (): Promise<void> => {
                const dockerUri = DockerUri.parse(uri);
                const containerOS = dockerUri.options?.containerOS || await getDockerOSType();
                const destDirectory = containerOS === 'windows' ?
                    path.win32.dirname(dockerUri.windowsPath) :
                    path.posix.dirname(dockerUri.path);

                await ext.runWithDefaultShell(
                    client => client.writeFile({
                        container: dockerUri.containerId,
                        path: destDirectory,
                        operatingSystem: containerOS,
                    }),
                    {
                        stdInPipe: tarPackStream(Buffer.from(content), path.basename(uri.path)),
                    }
                );
            };

        return callWithTelemetryAndErrorHandling(
            `containerFilesProvider.writeFile`,
            async actionContext => {
                actionContext.errorHandling.suppressDisplay = true; // Suppress display. VSCode already has a modal popup.
                actionContext.errorHandling.rethrow = true; // Rethrow to hit the try/catch outside this block.

                await method();
            });
    }

    public delete(uri: vscode.Uri, options: { recursive: boolean; }): void {
        throw new MethodNotImplementedError();
    }

    public rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void {
        throw new MethodNotImplementedError();
    }

    public copy?(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean; }): void {
        throw new MethodNotImplementedError();
    }
}
