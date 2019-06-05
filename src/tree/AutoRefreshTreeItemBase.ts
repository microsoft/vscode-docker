/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TreeView, TreeViewVisibilityChangeEvent, workspace, WorkspaceConfiguration } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, GenericTreeItem, IActionContext, InvalidTreeItem, registerEvent } from "vscode-azureextensionui";
import { isLinux } from "../utils/osVersion";
import { treeUtils } from "../utils/treeUtils";
import { OpenUrlTreeItem } from "./OpenUrlTreeItem";

export abstract class AutoRefreshTreeItemBase<T> extends AzExtParentTreeItem {
    private _currentItems: T[] | undefined;
    private _itemsFromPolling: T[] | undefined;
    private _failedToConnect: boolean = false;

    public abstract noItemsMessage: string;
    public abstract getItemID(item: T): string;
    public abstract getItems(): Promise<T[]>;
    public abstract convertToTreeItems(items: T[]): Promise<AzExtTreeItem[]>;

    public initAutoRefresh(treeView: TreeView<AzExtTreeItem>): void {
        let intervalId: NodeJS.Timeout;
        registerEvent('treeView.onDidChangeVisibility', treeView.onDidChangeVisibility, (context: IActionContext, e: TreeViewVisibilityChangeEvent) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.suppressIfSuccessful = true;
            context.telemetry.properties.isActivationEvent = 'true';

            if (e.visible) {
                const configOptions: WorkspaceConfiguration = workspace.getConfiguration('docker');
                const refreshInterval: number = configOptions.get<number>('explorerRefreshInterval', 1000);
                intervalId = setInterval(
                    async () => {
                        if (await this.hasChanged()) {
                            await this.refresh();
                        }
                    },
                    refreshInterval);
            } else {
                clearInterval(intervalId);
            }
        });
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        try {
            this._currentItems = this._itemsFromPolling || await this.getSortedItems();
            this._itemsFromPolling = undefined;
            this._failedToConnect = false;
        } catch (error) {
            this._currentItems = undefined;
            this._failedToConnect = true;
            context.telemetry.properties.failedToConnect = 'true';
            return this.getDockerErrorTreeItems(error);
        }

        if (this._currentItems.length === 0) {
            context.telemetry.properties.noItems = 'true';
            return [new GenericTreeItem(this, {
                label: this.noItemsMessage,
                iconPath: treeUtils.getThemedIconPath('info'),
                contextValue: 'dockerNoItems'
            })];
        } else {
            return await this.convertToTreeItems(this._currentItems);
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (this._failedToConnect) {
            return 0; // children are already sorted
        } else {
            return super.compareChildrenImpl(ti1, ti2);
        }
    }

    private getDockerErrorTreeItems(error: unknown): AzExtTreeItem[] {
        const connectionMessage = 'Failed to connect. Is Docker installed and running?';
        const installDockerUrl = 'https://aka.ms/AA37qtj';
        const linuxPostInstallUrl = 'https://aka.ms/AA37yk6';
        const troubleshootingUrl = 'https://aka.ms/AA37qt2';

        const result: AzExtTreeItem[] = [
            new InvalidTreeItem(this, error, { label: connectionMessage, contextValue: 'dockerConnectionError', description: '' }),
            new OpenUrlTreeItem(this, 'Install Docker...', installDockerUrl),
            new OpenUrlTreeItem(this, 'Additional Troubleshooting...', troubleshootingUrl),
        ];

        if (isLinux()) {
            result.push(new OpenUrlTreeItem(this, 'Manage Docker as a non-root user on Linux...', linuxPostInstallUrl))
        }

        return result;
    }

    private async getSortedItems(): Promise<T[]> {
        const items: T[] = await this.getItems();
        return items.sort((a, b) => this.getItemID(a).localeCompare(this.getItemID(b)));
    }

    private async hasChanged(): Promise<boolean> {
        try {
            this._itemsFromPolling = await this.getSortedItems();
        } catch {
            this._itemsFromPolling = undefined;
        }

        return !this.areArraysEqual(this._currentItems, this._itemsFromPolling);
    }

    private areArraysEqual(array1: T[] | undefined, array2: T[] | undefined): boolean {
        if (array1 === array2) {
            return true;
        } else if (array1 && array2) {
            if (array1.length !== array2.length) {
                return false;
            } else {
                return !array1.some((item1, index) => {
                    return this.getItemID(item1) !== this.getItemID(array2[index]);
                });
            }
        } else {
            return false;
        }
    }
}
