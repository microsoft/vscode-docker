/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestPromiseOptions } from "request-promise-native";
import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, GenericTreeItem, IActionContext } from "vscode-azureextensionui";
import { dockerHubUrl, keytarConstants, PAGE_SIZE } from "../../constants";
import { ext } from "../../extensionVariables";
import { nonNullProp } from "../../utils/nonNull";
import { registryRequest } from "../../utils/registryRequestUtils";
import { treeUtils } from "../../utils/treeUtils";
import { isAncestoryOfRegistryType, RegistryType } from "../RegistryType";
import { DockerHubRegistryTreeItem } from "./DockerHubRegistryTreeItem";
import { DockerHubPasswordStep } from "./loginWizard/DockerHubPasswordStep";
import { DockerHubUsernameStep } from "./loginWizard/DockerHubUsernameStep";
import { IDockerHubWizardContext } from "./loginWizard/IDockerHubWizardContext";

export class DockerHubAccountTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = RegistryType.dockerHub + 'Account';
    public contextValue: string = DockerHubAccountTreeItem.contextValue;
    public label: string = 'Docker Hub';
    public childTypeLabel: string = 'namespace';
    public baseUrl: string = dockerHubUrl;
    public username?: string;
    public password?: string;

    private _token?: string;
    private _nextLink: string | undefined;
    private _isInitialized: boolean = false;

    public get iconPath(): treeUtils.IThemedIconPath {
        return treeUtils.getThemedIconPath('docker');
    }

    public async loadMoreChildrenImpl(clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        if (!this._isInitialized) {
            if (ext.keytar) {
                this.username = await ext.keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey);
                this.password = await ext.keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey);
            }
            this._isInitialized = true;
        }

        if (clearCache) {
            this._nextLink = undefined;
            await this.refreshToken();
        }

        if (!this._token) {
            const ti = new GenericTreeItem(this, {
                label: 'Log In...',
                contextValue: 'dockerHubLogin',
                commandId: 'vscode-docker.registries.dockerHub.logIn',
                includeInTreeItemPicker: true
            });
            ti.commandArgs = [this];
            return [ti];
        } else {
            const url: string = this._nextLink ? this._nextLink : `v2/repositories/namespaces?page_size=${PAGE_SIZE}`;
            let response = await registryRequest<INamespaces>(this, 'GET', url);
            this._nextLink = response.body.next;
            return this.createTreeItemsWithErrorHandling(
                response.body.namespaces,
                'invalidDockerHubNamespace',
                n => new DockerHubRegistryTreeItem(this, n),
                n => n
            );
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public isAncestorOfImpl(expectedContextValue: string): boolean {
        return isAncestoryOfRegistryType(expectedContextValue, RegistryType.dockerHub);
    }

    public async addAuth(options: RequestPromiseOptions): Promise<void> {
        if (this._token) {
            options.headers = {
                Authorization: 'JWT ' + this._token
            }
        }
    }

    public async logIn(context: IActionContext): Promise<void> {
        const wizardContext: IDockerHubWizardContext = context;
        const wizard = new AzureWizard(wizardContext, {
            title: 'Log In to Docker Hub',
            promptSteps: [
                new DockerHubUsernameStep(),
                new DockerHubPasswordStep()
            ]
        });
        await wizard.prompt();
        await wizard.execute();

        this.username = nonNullProp(wizardContext, 'username');
        this.password = nonNullProp(wizardContext, 'password');
        await this.refreshToken();

        if (ext.keytar) {
            await ext.keytar.setPassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey, this.password);
            await ext.keytar.setPassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey, this.username);
        }

        await this.refresh();
    }

    public async logOut(): Promise<void> {
        this.username = undefined;
        this.password = undefined;
        this._token = undefined;
        this._nextLink = undefined;
        if (ext.keytar) {
            await ext.keytar.deletePassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey);
            await ext.keytar.deletePassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey);

            // We don't cache the token in keytar anymore, but we should still delete it when logging out for the sake of backwards compatability
            await ext.keytar.deletePassword(keytarConstants.serviceId, keytarConstants.dockerHubTokenKey);
        }

        await this.refresh();
    }

    private async refreshToken(): Promise<void> {
        if (this.username && this.password) {
            const url = 'v2/users/login';
            const body = { username: this.username, password: this.password };
            const response = await registryRequest<IToken>(this, 'POST', url, { body });
            this._token = response.body.token;
        } else {
            this._token = undefined;
        }
    }
}

interface IToken {
    token: string
}

interface INamespaces {
    namespaces: string[];
    next?: string;
}
