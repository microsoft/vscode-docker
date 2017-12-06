import * as vscode from 'vscode';
import * as path from 'path';
import * as dockerHub from '../utils/dockerHubUtils'
import * as keytarType from 'keytar';
import * as ContainerModels from '../../node_modules/azure-arm-containerregistry/lib/models';
import * as ContainerOps from '../../node_modules/azure-arm-containerregistry/lib/operations';
import ContainerRegistryManagementClient = require('azure-arm-containerregistry');
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { AzureRegistryNode, AzureLoadingNode, AzureNotSignedInNode } from './azureRegistryNodes';
import { DockerHubOrgNode } from './dockerHubNodes';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';
import { ServiceClientCredentials } from 'ms-rest';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';

const ContainerRegistryManagement = require('azure-arm-containerregistry');

export class RegistryRootNode extends NodeBase {
    private _keytar: typeof keytarType;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public eventEmitter: vscode.EventEmitter<NodeBase>
    ) {
        super(label);
        try {
            this._keytar = require(`${vscode.env.appRoot}/node_modules/keytar`);
        } catch (e) {
            // unable to find keytar
        }
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
        }
    }

    async getChildren(element: RegistryRootNode): Promise<NodeBase[]> {
        if (element.contextValue === 'dockerHubRootNode') {
            return this.getDockerHubOrgs();
        } else {
            return [];
        }
    }

    private async getDockerHubOrgs(): Promise<DockerHubOrgNode[]> {
        const orgNodes: DockerHubOrgNode[] = [];

        let id: { username: string, password: string, token: string } = { username: null, password: null, token: null };

        if (this._keytar) {
            id.token = await this._keytar.getPassword('vscode-docker', 'dockerhub.token');
            id.username = await this._keytar.getPassword('vscode-docker', 'dockerhub.username');
            id.password = await this._keytar.getPassword('vscode-docker', 'dockerhub.password');
        }

        if (!id.token) {
            id = await dockerHub.dockerHubLogin();
            if (id && id.token) {
                if (this._keytar) {
                    this._keytar.setPassword('vscode-docker', 'dockerhub.token', id.token);
                    this._keytar.setPassword('vscode-docker', 'dockerhub.password', id.password);
                    this._keytar.setPassword('vscode-docker', 'dockerhub.username', id.username);
                }
            } else {
                return orgNodes;
            }
        } else {
            dockerHub.setDockerHubToken(id.token);
        }

        const user: dockerHub.User = await dockerHub.getUser();
        const myRepos: dockerHub.Repository[] = await dockerHub.getRepositories(user.username);
        const namespaces = [...new Set(myRepos.map(item => item.namespace))];
        namespaces.forEach((namespace) => {
            let iconPath = {
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
            };
            let node = new DockerHubOrgNode(`${namespace}`, 'dockerHubNamespace', iconPath);
            node.userName = id.username;
            node.password = id.password;
            node.token = id.token;
            orgNodes.push(node);
        });

        return orgNodes;
    }

}
