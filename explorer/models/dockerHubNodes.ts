import * as vscode from 'vscode';
import * as path from 'path';
import * as dockerHub from './dockerHubUtils';
import { NodeBase } from './nodeBase';


export class DockerHubOrgNode extends NodeBase {


    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {}
    ) {
        super(label);
    }

    public repository: string;
    public userName: string;
    public password: string;
    public token: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    async getChildren(element: DockerHubOrgNode): Promise<DockerHubRepositoryNode[]> {
        const repoNodes: DockerHubRepositoryNode[] = [];
        let node: DockerHubRepositoryNode;

        const user: dockerHub.User = await dockerHub.getUser();
        const myRepos: dockerHub.Repository[] = await dockerHub.getRepositories(user.username);

        for (let i = 0; i < myRepos.length; i++) {
            const myRepo: dockerHub.RepositoryInfo = await dockerHub.getRepositoryInfo(myRepos[i]);
            let iconPath = {
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
            };
            node = new DockerHubRepositoryNode(myRepo.name, 'dockerHubRepository', iconPath);
            node.repository = myRepo;
            node.userName = element.userName;
            node.password = element.password;
            repoNodes.push(node);
        }
        return repoNodes;
    }
}

export class DockerHubRepositoryNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {}
    ) {
        super(label);
    }

    public repository: any;
    public userName: string;
    public password: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    async getChildren(element: DockerHubRepositoryNode): Promise<DockerHubImageNode[]> {
        const imageNodes: DockerHubImageNode[] = [];
        let node: DockerHubImageNode;

        const myTags: dockerHub.Tag[] = await dockerHub.getRepositoryTags({namespace: element.repository.namespace, name: element.repository.name});
        for (let i = 0; i < myTags.length; i++) {
            node = new DockerHubImageNode(`${element.repository.name}:${myTags[i].name}`, 'dockerHubImageTag');
            node.password = element.password;
            node.userName = element.userName;
            node.repository = element.repository;
            imageNodes.push(node);
        }

        return imageNodes;

    }
}

export class DockerHubImageNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string
    ) {
        super(label);
    }

    // this needs to be empty string for DockerHub
    public serverUrl: string = '';
    public userName: string;
    public password: string;
    public repository: any;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
    }
}



