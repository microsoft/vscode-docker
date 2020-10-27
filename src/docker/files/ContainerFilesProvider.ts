import * as vscode from 'vscode';
import { DockerOSType } from '../Common';
import { DockerApiClient } from '../DockerApiClient';
import { DirectoryItem, DockerContainerExecutor, getLinuxContainerDirectoryItems, getWindowsContainerDirectoryItems } from './ContainerFilesUtils';
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

            const containerOS = dockerUri.options?.containerOS ?? await this.getContainerOS(dockerUri.containerId);

            switch (containerOS) {
                case 'linux':
                    const user: string = undefined;
                    const command: string[] = [ '/bin/sh', '-c', `stat -c "%W;%Y;%s;%F" "${dockerUri.path}"` ];

                    const result = await this.dockerClientProvider().execInContainer(/* context: */ undefined, dockerUri.containerId, command, { user });

                    const statRegex = /^(?<ctime>\d+);(?<mtime>\d+);(?<size>\d+);(?<type>.+)$/g;

                    const statMatch = statRegex.exec(result);

                    if (statMatch === null) {
                        throw new Error('Unexpected stat output.');
                    }

                    // NOTE: stat() (i.e. '%W' and "%Y') reports time in seconds since the epoch; VS Code requires milliseconds since the epoch.

                    return {
                        ctime: parseInt(statMatch.groups.ctime, 10) * 1000,
                        mtime: parseInt(statMatch.groups.mtime, 10) * 1000,
                        size: parseInt(statMatch.groups.size, 10),
                        type: statMatch.groups.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File
                    };

                case 'windows':
                default:
                    throw new Error('Not yet implemented.');
            }
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
                case 'linux': items = await getLinuxContainerDirectoryItems(executor, dockerUri.path); break;
                case 'windows': items = await getWindowsContainerDirectoryItems(executor, dockerUri.windowsPath); break;
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
