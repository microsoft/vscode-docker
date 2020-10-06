import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { execAsync } from '../../utils/spawnAsync';
import { DockerOSType } from '../Common';
import { DockerContainerExecutor, getContainerDirectoryItems } from '../DockerContainerDirectoryProvider';
import { DockerUri, DockerUriFileType } from './dockerUri';

export class ContainerFilesProvider implements vscode.FileSystemProvider {

    private readonly changeEmitter: vscode.EventEmitter<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

    public get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
        return this.changeEmitter.event;
    }

    public watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
        throw new Error('Method not implemented.');
    }

    public stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        const dockerUri = DockerUri.parse(uri);

        // TODO: Implement!
        return {
            ctime: 0,
            mtime: 0,
            size: 0,
            type: ContainerFilesProvider.toVsCodeFileType(dockerUri.fileType)
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
        const method =
            async (): Promise<Uint8Array> => {

                const containerId = uri.authority;
                const containerPath = uri.path;

                const localPath = path.join(os.tmpdir(), 'testfile.txt');

                const command = `docker cp "${containerId}:${containerPath}" "${localPath}"`;

                await execAsync(command, {});

                // TODO: Read from temp path.

                // NOTE: False positive: https://github.com/nodesecurity/eslint-plugin-security/issues/65
                // eslint-disable-next-line @typescript-eslint/tslint/config
                const contents = await fs.readFile(localPath);

                const results = Uint8Array.from(contents);

                try {
                    return results;
                } finally {
                    await fs.remove(localPath);
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

    private static async getContainerPlatform(id: string): Promise<DockerOSType | undefined> {
        const result = await ext.dockerClient.inspectContainer(/* context */ undefined, id);

        return result.Platform
    }

    private static toVsCodeFileType(fileType: DockerUriFileType): vscode.FileType {
        switch (fileType) {
            case 'directory': return vscode.FileType.Directory;
            case 'file': return vscode.FileType.File;
            default:

                return vscode.FileType.Unknown;
        }
    }
}
