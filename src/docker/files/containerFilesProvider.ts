import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { execAsync } from '../../utils/spawnAsync';
import { DockerOSType } from '../Common';
import { DockerContainerExecutor, getContainerDirectoryItems } from '../DockerContainerDirectoryProvider';

export class ContainerFilesProvider implements vscode.FileSystemProvider {

    private readonly changeEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    public get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
        return this.changeEmitter.event;
    }

    public watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        throw new Error('Method not implemented.');
    }

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        // TODO: Implement!
        return {
            ctime: 0,
            mtime: 0,
            size: 0,
            type: vscode.FileType.Directory
        };
    }

    public readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        const method = async (): Promise <[string, vscode.FileType][]> => {

            // Container URI: docker://<containerId>/<path>
            const containerId = uri.authority;
            const parentPath = uri.path;

            const executor: DockerContainerExecutor =
            async (id, command, user) => {

                let dockerCommand = 'docker exec ';

                if (user) {
                    dockerCommand += `--user "${user}" `;
                }

                dockerCommand += `"${id}" ${command}`;

                const results = await execAsync(dockerCommand);

                return results.stdout;
            };

            const osType = await ContainerFilesProvider.getContainerPlatform(containerId)

            const items = await getContainerDirectoryItems(executor, containerId, parentPath, osType);

            return items.map(item => [item.name, item.type === 'directory' ? vscode.FileType.Directory : vscode.FileType.File])
        };

        return method();
    }

    public createDirectory(uri: vscode.Uri): void | Thenable<void> {
        throw new Error('Method not implemented.');
    }

    public readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        throw new Error('Method not implemented.');
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

    private static async getContainerPlatform(id: string): Promise<DockerOSType | undefined> {
        const result = await ext.dockerClient.inspectContainer(/* context */ undefined, id);

        return result.Platform
    }
}
