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

        console.log(element.label);
        return element;
    }

    async getChildren(element?: DockerNode): Promise<DockerNode[]> {
        return this.getDockerNodes(element);
    }

    private async getDockerNodes(element?: DockerNode): Promise<DockerNode[]> {

        const nodes: DockerNode[] = [];
        if (!element) {
            nodes.push(new DockerNode("Images", vscode.TreeItemCollapsibleState.Collapsed));
            nodes.push(new DockerNode("Running Containers", vscode.TreeItemCollapsibleState.Collapsed));
            nodes.push(new DockerNode("Stopped Containers", vscode.TreeItemCollapsibleState.Collapsed));
        } else {

            if (element.label === 'Images') {
                const images: Docker.ImageDesc[] = await docker.getImageDescriptors();
                if (!images || images.length == 0) {
                    vscode.window.showInformationMessage('There are no docker images yet. Try Build first.');
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

            if (element.label === 'Running Containers') {
                const containers: Docker.ContainerDesc[] = await docker.getContainerDescriptors();
                if (!containers || containers.length == 0) {
                    vscode.window.showInformationMessage('There are no running docker containers.');
                    return [];
                } else {
                    for (let i = 0; i < containers.length; i++) {
                        nodes.push(new DockerNode(containers[i].Image, vscode.TreeItemCollapsibleState.None));
                    }
                }
            }
        }


        return nodes;


        // if (this.pathExists(packageJsonPath)) {
        //     const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        //     const toDep = (moduleName: string): DockerNode => {
        //         if (this.pathExists(path.join(this.workspaceRoot, 'node_modules', moduleName))) {
        //             return new DockerNode(moduleName, vscode.TreeItemCollapsibleState.Collapsed);
        //         } else {
        //             return new DockerNode(moduleName, vscode.TreeItemCollapsibleState.None, {
        //                 command: 'extension.openPackageOnNpm',
        //                 title: '',
        //                 arguments: [moduleName],
        //             });
        //         }
        //     }

        //     const deps = packageJson.dependencies
        //         ? Object.keys(packageJson.dependencies).map(toDep)
        //         : [];
        //     const devDeps = packageJson.devDependencies
        //         ? Object.keys(packageJson.devDependencies).map(toDep)
        //         : [];
        //     return deps.concat(devDeps);
        // } else {
        //     return [];
        // }
    }
}

class DockerNode extends vscode.TreeItem {

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }

    iconPath = {
        light: path.join(__filename, '..', '..', '..', 'images', 'light', 'mono_moby_small.png'),
        dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'mono_moby_small.png')
    };

    //contextValue = 'dependency';

}