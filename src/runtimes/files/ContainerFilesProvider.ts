/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { getDockerOSType } from '../../utils/osUtils';
import { tarPackStream, tarUnpackStream } from '../../utils/tarUtils';
import { AccumulatorStream, CommandNotSupportedError, DisposableLike, ListFilesItem } from '../docker';
import { DockerUri } from './DockerUri';

class MethodNotImplementedError extends CommandNotSupportedError {
    public constructor() {
        super(vscode.l10n.t('Method not implemented.'));
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

    public async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        const dockerUri = DockerUri.parse(uri);

        return {
            type: dockerUri.options.fileType,
            mtime: 0,
            ctime: 0,
            size: 0,
        };
    }

    public async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const dockerUri = DockerUri.parse(uri);
        const containerOS = dockerUri.options?.containerOS || await getDockerOSType();

        const items: ListFilesItem[] = await ext.runWithDefaults(client =>
            client.listFiles({
                container: dockerUri.containerId,
                path: containerOS === 'windows' ? dockerUri.windowsPath : dockerUri.path,
                operatingSystem: containerOS,
            }),
        );

        return items.map(item => [item.name, item.type]);
    }

    public createDirectory(uri: vscode.Uri): void {
        throw new MethodNotImplementedError();
    }

    public async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const dockerUri = DockerUri.parse(uri);
        const containerOS = dockerUri.options?.containerOS || await getDockerOSType();

        const accumulator = new AccumulatorStream();
        const targetStream = containerOS === 'windows' ? accumulator : tarUnpackStream(accumulator);

        const generator = ext.streamWithDefaults(
            client => client.readFile({
                container: dockerUri.containerId,
                path: containerOS === 'windows' ? dockerUri.windowsPath : dockerUri.path,
                operatingSystem: containerOS,
            }),
        );

        for await (const chunk of generator) {
            targetStream.write(chunk);
        }

        accumulator.end();

        return await accumulator.getBytes();
    }

    public writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
        return callWithTelemetryAndErrorHandling(
            `containerFilesProvider.writeFile`,
            async actionContext => {
                actionContext.errorHandling.suppressDisplay = true; // Suppress display. VSCode already has a modal popup.
                actionContext.errorHandling.rethrow = true; // Rethrow to hit the try/catch outside this block.

                const dockerUri = DockerUri.parse(uri);
                const containerOS = dockerUri.options?.containerOS || await getDockerOSType();
                const destDirectory = containerOS === 'windows' ?
                    path.win32.dirname(dockerUri.windowsPath) :
                    path.posix.dirname(dockerUri.path);

                const fileStats = await ext.runWithDefaults(
                    client => client.statPath({
                        container: dockerUri.containerId,
                        path: containerOS === 'windows' ? dockerUri.windowsPath : dockerUri.path,
                        operatingSystem: containerOS,
                    }),
                );

                const atime = new Date(fileStats?.atime ?? Date.now());
                const mtime = new Date(fileStats?.mtime ?? Date.now());
                const ctime = new Date(fileStats?.ctime ?? Date.now());
                const mode = fileStats?.mode;
                const gid = fileStats?.gid;
                const uid = fileStats?.uid;

                await ext.runWithDefaults(
                    client => client.writeFile({
                        container: dockerUri.containerId,
                        path: destDirectory,
                        operatingSystem: containerOS,
                    }),
                    {
                        stdInPipe: tarPackStream(Buffer.from(content), path.basename(uri.path), atime, mtime, ctime, mode, gid, uid),
                    },
                );
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
