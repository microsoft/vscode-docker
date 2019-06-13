/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationChangeEvent, TreeView, TreeViewVisibilityChangeEvent, workspace, WorkspaceConfiguration } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, GenericTreeItem, IActionContext, InvalidTreeItem, registerEvent } from "vscode-azureextensionui";
import { configPrefix } from "../constants";
import { isLinux } from "../utils/osUtils";
import { getThemedIconPath } from "./IconPath";
import { LocalGroupTreeItemBase } from "./LocalGroupTreeItemBase";
import { OpenUrlTreeItem } from "./OpenUrlTreeItem";
import { CommonGroupBy, CommonSortBy, getTreeSetting, ITreeSettingInfo } from "./settings/commonTreeSettings";

export interface ILocalItem {
    createdTime: number;
    treeId: string;
    data: {};
}

export type LocalChildType<T extends ILocalItem> = new (parent: AzExtParentTreeItem, item: T) => AzExtTreeItem & { createdTime: number; };
export type LocalChildGroupType<T extends ILocalItem> = new (parent: LocalRootTreeItemBase<T>, group: string, items: T[]) => LocalGroupTreeItemBase<T>;

export abstract class LocalRootTreeItemBase<T extends ILocalItem> extends AzExtParentTreeItem {
    private _currentItems: T[] | undefined;
    private _itemsFromPolling: T[] | undefined;
    private _failedToConnect: boolean = false;

    public abstract treePrefix: string;
    public abstract noItemsMessage: string;
    public abstract childType: LocalChildType<T>;
    public abstract childGroupType: LocalChildGroupType<T>;
    public abstract getItems(): Promise<T[] | undefined>;
    public abstract getGroup(item: T): string | undefined;
    public abstract sortBySettingInfo: ITreeSettingInfo<CommonSortBy>;
    public abstract groupBySettingInfo: ITreeSettingInfo<string | CommonGroupBy>;

    public get contextValue(): string {
        return this.treePrefix;
    }

    public registerRefreshEvents(treeView: TreeView<AzExtTreeItem>): void {
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

        registerEvent('treeView.onDidChangeConfiguration', workspace.onDidChangeConfiguration, async (context: IActionContext, e: ConfigurationChangeEvent) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.suppressIfSuccessful = true;
            context.telemetry.properties.isActivationEvent = 'true';

            if (e.affectsConfiguration(`${configPrefix}.${this.treePrefix}`)) {
                await this.refresh();
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
                iconPath: getThemedIconPath('info'),
                contextValue: 'dockerNoItems'
            })];
        } else {
            return this.groupItems(this._currentItems);
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (this._failedToConnect) {
            return 0; // children are already sorted
        } else {
            if (ti1 instanceof this.childGroupType && ti2 instanceof this.childGroupType) {
                const groupBy = getTreeSetting(this.groupBySettingInfo);
                if (groupBy === 'CreatedTime' && ti2.maxCreatedTime !== ti1.maxCreatedTime) {
                    return ti2.maxCreatedTime - ti1.maxCreatedTime;
                }
            } else if (ti1 instanceof this.childType && ti2 instanceof this.childType) {
                const sortBy = getTreeSetting(this.sortBySettingInfo)
                if (sortBy === 'CreatedTime' && ti2.createdTime !== ti1.createdTime) {
                    return ti2.createdTime - ti1.createdTime;
                }
            }

            return super.compareChildrenImpl(ti1, ti2);
        }
    }

    private async groupItems(items: T[]): Promise<AzExtTreeItem[]> {
        const itemsWithNoGroup: T[] = [];
        const groupMap = new Map<string, T[]>();
        for (const item of items) {
            const groupName: string | undefined = this.getGroup(item);
            if (!groupName) {
                itemsWithNoGroup.push(item);
            } else {
                const groupedItems = groupMap.get(groupName);
                if (groupedItems) {
                    groupedItems.push(item);
                } else {
                    groupMap.set(groupName, [item]);
                }
            }
        }

        return await this.createTreeItemsWithErrorHandling(
            [...itemsWithNoGroup, ...groupMap.entries()],
            'invalidLocalItemOrGroup',
            itemOrGroup => {
                if (Array.isArray(itemOrGroup)) {
                    const [groupName, groupedItems] = itemOrGroup;
                    return new this.childGroupType(this, groupName, groupedItems);
                } else {
                    return new this.childType(this, itemOrGroup);
                }
            },
            itemOrGroup => {
                if (Array.isArray(itemOrGroup)) {
                    const [group] = itemOrGroup;
                    return group;
                } else {
                    return itemOrGroup.treeId;
                }
            }
        );
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
        const items: T[] = await this.getItems() || [];
        return items.sort((a, b) => a.treeId.localeCompare(b.treeId));
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
                    return item1.treeId !== array2[index].treeId;
                });
            }
        } else {
            return false;
        }
    }
}
