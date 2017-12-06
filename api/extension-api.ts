
import { DockerExtensionAPI, IExplorerRegistryProvider } from './docker-api';
import * as vscode from 'vscode';

export class APIImpl implements DockerExtensionAPI {
    
    private _onDidRegister: vscode.EventEmitter<IExplorerRegistryProvider> = new vscode.EventEmitter<IExplorerRegistryProvider>();
    public readonly onDidRegister: vscode.Event<IExplorerRegistryProvider> = this._onDidRegister.event;

    public registry: IExplorerRegistryProvider[];

    constructor() {
        this.registry = [];
    }

    registerExplorerRegistryProvider(provider: IExplorerRegistryProvider): void {
        this.registry.push(provider);
        this._onDidRegister.fire(provider);
    }

    activateContributingExtensions(): Promise<any> {
        const contributingExtensions = vscode.extensions.all.filter((extension) => (typeof extension.packageJSON['PeterJausovec.vscode-docker'] !== 'undefined'));
        return Promise.all(
            contributingExtensions.map((extension) => extension.activate())
        );
    }
}

export const API = new APIImpl();
