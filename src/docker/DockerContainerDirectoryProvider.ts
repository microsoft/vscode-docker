import { DockerOSType } from "./Common";
import { DockerApiClient } from "./DockerApiClient";

export interface DirectoryItem {
    name: string;
    path: string;
    type: 'directory' | 'file';
}

export async function getContainerDirectoryItems(client: DockerApiClient, containerId: string, path: string, osType: DockerOSType): Promise<DirectoryItem[]> {
    return [
        {
            name: 'dir',
            path: '/dir',
            type: 'directory'
        },
        {
            name: 'file.txt',
            path: '/file.txt',
            type: 'file'
        }
    ];
}
