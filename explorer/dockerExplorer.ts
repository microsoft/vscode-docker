import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { docker } from '../commands/utils/docker-endpoint';

export class DockerExplorerProvider implements vscode.TreeDataProvider<DockerNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<DockerNode | undefined> = new vscode.EventEmitter<DockerNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<DockerNode | undefined> = this._onDidChangeTreeData.event;

    constructor() {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DockerNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DockerNode): Promise<DockerNode[]> {
        return this.getDockerNodes(element);
    }

    private async getDockerNodes(element?: DockerNode): Promise<DockerNode[]> {

        let opts = {};
        let iconPath: any = {};
        const nodes: DockerNode[] = [];

        if (!element) {
            nodes.push(new DockerNode("Images", vscode.TreeItemCollapsibleState.Collapsed, null, null));
            nodes.push(new DockerNode("Containers", vscode.TreeItemCollapsibleState.Collapsed, null, null));
            // nodes.push(new DockerNode("Registries", vscode.TreeItemCollapsibleState.Collapsed, null, null));
        } else {

            if (element.label === 'Images') {
                const images: Docker.ImageDesc[] = await docker.getImageDescriptors();
                if (!images || images.length == 0) {
                    return [];
                } else {
                    for (let i = 0; i < images.length; i++) {
                        if (!images[i].RepoTags) {
                            nodes.push(new DockerNode("<none>:<none>", vscode.TreeItemCollapsibleState.None));
                        } else {
                            for (let j = 0; j < images[i].RepoTags.length; j++) {
                                nodes.push(new DockerNode(images[i].RepoTags[j], vscode.TreeItemCollapsibleState.None));
                            }
                        }
                    }
                }
            }

            if (element.label === 'Containers') {

                opts = {
                    "filters": {
                        "status": ["created", "restarting", "running", "paused", "exited", "dead"]
                    }
                };


                const containers: Docker.ContainerDesc[] = await docker.getContainerDescriptors(opts);
                if (!containers || containers.length == 0) {
                    return [];
                } else {
                    for (let i = 0; i < containers.length; i++) {
                        if (['exited', 'dead'].includes(containers[i].State)) {
                            // show stopped icon
                            iconPath = {
                                light: path.join(__filename, '..', '..', '..', 'images', 'light', 'mono_moby_small.png'),
                                dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'mono_moby_small.png')
                            }
                        } else {
                            iconPath = {
                                light: path.join(__filename, '..', '..', '..', 'images', 'light', 'moby_small.png'),
                                dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'moby_small.png')
                            }
                        }
                        nodes.push(new DockerNode(containers[i].Image + ' [' + containers[i].Status + ']', vscode.TreeItemCollapsibleState.None, null, iconPath));
                    }
                }
            }

            if (element.label === 'Registries') {

                nodes.push(new DockerNode("DockerHub", vscode.TreeItemCollapsibleState.Collapsed, null, null));
                nodes.push(new DockerNode("Azure", vscode.TreeItemCollapsibleState.Collapsed, null, null));
            }


        }
        return nodes;
    }
}

class DockerNode extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command,
        public iconPath: any = {
            light: path.join(__filename, '..', '..', '..', 'images', 'light', 'mono_moby_small.png'),
            dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'mono_moby_small.png')
        }
    ) {
        super(label, collapsibleState);
        this.iconPath = iconPath;
    }


    // iconPath = {
    //     light: path.join(__filename, '..', '..', '..', 'images', 'light', 'mono_moby_small.png'),
    //     dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'mono_moby_small.png')
    // };

    // if(icon) {
    //     iconPath = icon
    // }
    contextValue = 'dockerImage';

}