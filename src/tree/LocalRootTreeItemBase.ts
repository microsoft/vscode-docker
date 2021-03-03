/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationChangeEvent, ConfigurationTarget, ThemeColor, ThemeIcon, TreeView, TreeViewVisibilityChangeEvent, window, workspace, WorkspaceConfiguration } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, GenericTreeItem, IActionContext, IParsedError, parseError, registerEvent } from "vscode-azureextensionui";
import { showDockerInstallNotification } from "../commands/dockerInstaller";
import { configPrefix } from "../constants";
import { DockerObject } from "../docker/Common";
import { NotSupportedError } from "../docker/NotSupportedError";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { dockerInstallStatusProvider } from "../utils/DockerInstallStatusProvider";
import { DockerExtensionKind, getVSCodeRemoteInfo, IVSCodeRemoteInfo, RemoteKind } from "../utils/getVSCodeRemoteInfo";
import { LocalGroupTreeItemBase } from "./LocalGroupTreeItemBase";
import { OpenUrlTreeItem } from "./OpenUrlTreeItem";
import { CommonGroupBy, CommonProperty, CommonSortBy, sortByProperties } from "./settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "./settings/ITreeSettingInfo";
import { ITreeSettingsWizardContext, ITreeSettingWizardInfo } from "./settings/ITreeSettingsWizardContext";
import { TreeSettingListStep } from "./settings/TreeSettingListStep";
import { TreeSettingStep } from "./settings/TreeSettingStep";

type DockerStatus = 'NotInstalled' | 'Installed' | 'Running';

export type LocalChildType<T extends DockerObject> = new (parent: AzExtParentTreeItem, item: T) => AzExtTreeItem & { createdTime: number; size?: number };
export type LocalChildGroupType<TItem extends DockerObject, TProperty extends string | CommonProperty> = new (parent: LocalRootTreeItemBase<TItem, TProperty>, group: string, items: TItem[]) => LocalGroupTreeItemBase<TItem, TProperty>;

const groupByKey: string = 'groupBy';
const sortByKey: string = 'sortBy';
export const labelKey: string = 'label';
export const descriptionKey: string = 'description';
let dockerInstallNotificationShownToUser: boolean = false;

export abstract class LocalRootTreeItemBase<TItem extends DockerObject, TProperty extends string | CommonProperty> extends AzExtParentTreeItem {
    public abstract labelSettingInfo: ITreeSettingInfo<TProperty>;
    public abstract descriptionSettingInfo: ITreeArraySettingInfo<TProperty>;
    public abstract groupBySettingInfo: ITreeSettingInfo<TProperty | CommonGroupBy>;
    public sortBySettingInfo: ITreeSettingInfo<CommonSortBy> = {
        properties: [...sortByProperties],
        defaultProperty: 'CreatedTime',
    }

    public abstract treePrefix: string;
    public abstract configureExplorerTitle: string;
    public abstract childType: LocalChildType<TItem>;
    public abstract childGroupType: LocalChildGroupType<TItem, TProperty>;

    public abstract getItems(context: IActionContext): Promise<TItem[] | undefined>;
    public abstract getPropertyValue(item: TItem, property: TProperty): string;

    // Redefining this as an abstract allows inheriting classes to either do an accessor or a property
    public readonly abstract childTypeLabel: string;

    public static autoRefreshViews: boolean = true;

    public groupBySetting: TProperty | CommonGroupBy;
    public sortBySetting: CommonSortBy;
    public labelSetting: TProperty;
    public descriptionSetting: TProperty[];
    protected failedToConnect: boolean = false;

    private _currentItems: TItem[] | undefined;
    private _itemsFromPolling: TItem[] | undefined;
    private _currentDockerStatus: DockerStatus;

    public get contextValue(): string {
        return this.treePrefix;
    }

    public get config(): WorkspaceConfiguration {
        return workspace.getConfiguration(`${configPrefix}.${this.treePrefix}`);
    }

    private get autoRefreshEnabled(): boolean {
        return window.state.focused && LocalRootTreeItemBase.autoRefreshViews;
    }

    protected getRefreshInterval(): number {
        const configOptions: WorkspaceConfiguration = workspace.getConfiguration('docker');
        return configOptions.get<number>('explorerRefreshInterval', 2000)
    }

    public registerRefreshEvents(treeView: TreeView<AzExtTreeItem>): void {
        let intervalId: NodeJS.Timeout;
        registerEvent('treeView.onDidChangeVisibility', treeView.onDidChangeVisibility, (context: IActionContext, e: TreeViewVisibilityChangeEvent) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.suppressIfSuccessful = true;
            context.telemetry.properties.isActivationEvent = 'true';

            if (e.visible) {

                const refreshInterval: number = this.getRefreshInterval();
                intervalId = setInterval(
                    async () => {
                        if (this.autoRefreshEnabled && await this.hasChanged(context)) {
                            // Auto refresh could be disabled while invoking the hasChanged()
                            // So check again before starting the refresh.
                            if (this.autoRefreshEnabled) {
                                await this.refresh(context);
                            }
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
                await this.refresh(context);
            }
        });
    }

    protected getTreeItemForEmptyList(): AzExtTreeItem[] {
        return [new GenericTreeItem(this, {
            label: localize('vscode-docker.tree.noItemsFound', 'No items found'),
            iconPath: new ThemeIcon('info'),
            contextValue: 'dockerNoItems'
        })];
    }

    public clearPollingCache(): void {
        this._itemsFromPolling = undefined;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ext.activityMeasurementService.recordActivity('overallnoedit');

            this._currentItems = this._itemsFromPolling || await this.getSortedItems(context);
            this.clearPollingCache();
            this.failedToConnect = false;
            this._currentDockerStatus = 'Running';
        } catch (error) {
            this._currentItems = undefined;
            this.failedToConnect = true;
            context.telemetry.properties.failedToConnect = 'true';

            const parsedError = parseError(error);

            if (!this._currentDockerStatus) {
                this._currentDockerStatus = await dockerInstallStatusProvider.isDockerInstalled() ? 'Installed' : 'NotInstalled';
            }

            this.showDockerInstallNotificationIfNeeded();
            return this.getDockerErrorTreeItems(context, parsedError, this._currentDockerStatus === 'Installed');
        }

        if (this._currentItems.length === 0) {
            context.telemetry.properties.noItems = 'true';
            return this.getTreeItemForEmptyList();
        } else {
            this.groupBySetting = this.getTreeSetting(groupByKey, this.groupBySettingInfo);
            context.telemetry.properties.groupBySetting = this.groupBySetting;
            this.sortBySetting = this.getTreeSetting(sortByKey, this.sortBySettingInfo);
            context.telemetry.properties.sortBySetting = this.sortBySetting;
            this.labelSetting = this.getTreeSetting(labelKey, this.labelSettingInfo);
            context.telemetry.properties.labelSetting = this.labelSetting;
            this.descriptionSetting = this.getTreeArraySetting(descriptionKey, this.descriptionSettingInfo);
            context.telemetry.properties.descriptionSetting = this.descriptionSetting.toString();

            return this.groupItems(this._currentItems);
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (this.failedToConnect) {
            return 0; // children are already sorted
        } else {
            if (ti1 instanceof this.childGroupType && ti2 instanceof this.childGroupType) {
                if (this.groupBySetting === 'CreatedTime' && ti2.maxCreatedTime !== ti1.maxCreatedTime) {
                    return ti2.maxCreatedTime - ti1.maxCreatedTime;
                }
            } else if (ti1 instanceof this.childType && ti2 instanceof this.childType) {
                if (this.sortBySetting === 'CreatedTime' && ti2.createdTime !== ti1.createdTime) {
                    return ti2.createdTime - ti1.createdTime;
                } else if (this.sortBySetting === 'Size' && ti1.size !== undefined && ti2.size !== undefined) {
                    return ti2.size - ti1.size;
                }
            }

            return super.compareChildrenImpl(ti1, ti2);
        }
    }

    private async groupItems(items: TItem[]): Promise<AzExtTreeItem[]> {
        let itemsWithNoGroup: TItem[] = [];
        const groupMap = new Map<string, TItem[]>();

        if (this.groupBySetting === 'None') {
            itemsWithNoGroup = items;
        } else {
            for (const item of items) {
                const groupName: string | undefined = this.getPropertyValue(item, this.groupBySetting);
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
                    return getTreeId(itemOrGroup);
                }
            }
        );
    }

    public getTreeItemLabel(item: TItem): string {
        return this.getPropertyValue(item, this.labelSetting);
    }

    public getTreeItemDescription(item: TItem): string {
        const values: string[] = this.descriptionSetting.map(prop => this.getPropertyValue(item, prop));
        return values.join(' - ');
    }

    public getTreeSetting<T extends string>(setting: string, settingInfo: ITreeSettingInfo<T>): T {
        const value = this.config.get<T>(setting);
        if (value && settingInfo.properties.find(propInfo => propInfo.property === value)) {
            return value;
        } else {
            return settingInfo.defaultProperty;
        }
    }

    public getTreeArraySetting<T extends string>(setting: string, settingInfo: ITreeArraySettingInfo<T>): T[] {
        const value = this.config.get<T[]>(setting);
        if (Array.isArray(value) && value.every(v1 => !!settingInfo.properties.find(v2 => v1 === v2.property))) {
            return value;
        } else {
            return settingInfo.defaultProperty;
        }
    }

    public getSettingWizardInfoList(): ITreeSettingWizardInfo[] {
        return [
            {
                label: localize('vscode-docker.tree.config.label.label', 'Label'),
                setting: labelKey,
                currentValue: this.labelSetting,
                description: localize('vscode-docker.tree.config.label.description', 'The primary property to display.'),
                settingInfo: this.labelSettingInfo
            },
            {
                label: localize('vscode-docker.tree.config.description.label', 'Description'),
                setting: descriptionKey,
                currentValue: this.descriptionSetting,
                description: localize('vscode-docker.tree.config.description.description', 'Any secondary properties to display.'),
                settingInfo: this.descriptionSettingInfo
            },
            {
                label: localize('vscode-docker.tree.config.groupBy.label', 'Group By'),
                setting: groupByKey,
                currentValue: this.groupBySetting,
                description: localize('vscode-docker.tree.config.groupBy.description', 'The property used for grouping.'),
                settingInfo: this.groupBySettingInfo
            },
            {
                label: localize('vscode-docker.tree.config.sortBy.label', 'Sort By'),
                setting: sortByKey,
                currentValue: this.sortBySetting,
                description: localize('vscode-docker.tree.config.sortBy.description', 'The property used for sorting.'),
                settingInfo: this.sortBySettingInfo
            },
        ]
    }

    public async configureExplorer(context: IActionContext): Promise<void> {
        const infoList = this.getSettingWizardInfoList();
        const wizardContext: ITreeSettingsWizardContext = { infoList, ...context };
        const wizard = new AzureWizard(wizardContext, {
            title: this.configureExplorerTitle,
            promptSteps: [
                new TreeSettingListStep(),
                new TreeSettingStep()
            ],
            hideStepCount: true
        });
        await wizard.prompt();
        await wizard.execute();

        if (wizardContext.info) {
            // TODO: Should this be awaited?
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            this.config.update(wizardContext.info.setting, wizardContext.newValue, ConfigurationTarget.Global);
        } else {
            // reset settings
            for (const info of infoList) {
                // TODO: Should this be awaited?
                /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                this.config.update(info.setting, undefined, ConfigurationTarget.Global);
            }
        }
    }

    private getDockerErrorTreeItems(context: IActionContext, error: IParsedError, dockerInstalled: boolean): AzExtTreeItem[] {
        if (error.errorType === NotSupportedError.ErrorType) {
            return [new GenericTreeItem(this, { label: localize('vscode-docker.tree.contextNotSupported', 'This view is not supported in the current Docker context.'), contextValue: 'contextNotSupported' })];
        } else if (error.isUserCancelledError) {
            return [new GenericTreeItem(this, { label: localize('vscode-docker.tree.changingContexts', 'Changing Docker context...'), contextValue: 'changingContexts' })];
        }

        const result: AzExtTreeItem[] = dockerInstalled
            ? [
                new GenericTreeItem(this, { label: localize('vscode-docker.tree.dockerNotRunning', 'Failed to connect. Is Docker running?'), contextValue: 'dockerConnectionError', iconPath: new ThemeIcon('warning', new ThemeColor('problemsWarningIcon.foreground')) }),
                new GenericTreeItem(this, { label: localize('vscode-docker.tree.dockerNotRunningError', '  Error: {0}', error.message), contextValue: 'dockerConnectionError' }),
                new OpenUrlTreeItem(this, localize('vscode-docker.tree.additionalTroubleshooting', 'Additional Troubleshooting...'), 'https://aka.ms/AA37qt2')
            ]
            : [new GenericTreeItem(this, { label: localize('vscode-docker.tree.dockerNotInstalled', 'Failed to connect. Is Docker installed?'), contextValue: 'dockerConnectionError', iconPath: new ThemeIcon('warning', new ThemeColor('problemsWarningIcon.foreground')) })];

        const remoteInfo: IVSCodeRemoteInfo = getVSCodeRemoteInfo(context);
        if (remoteInfo.extensionKind === DockerExtensionKind.workspace && remoteInfo.remoteKind === RemoteKind.devContainer) {
            const ti = new OpenUrlTreeItem(this, localize('vscode-docker.tree.runningInDevContainer', 'Running Docker in a dev container...'), 'https://aka.ms/AA5xva6');
            result.push(ti);
        }

        return result;
    }

    private async getSortedItems(context: IActionContext): Promise<TItem[]> {
        if (ext.treeInitError === undefined) {
            const items: TItem[] = await this.getItems(context) || [];
            return items.sort((a, b) => getTreeId(a).localeCompare(getTreeId(b)));
        } else {
            throw ext.treeInitError;
        }
    }

    private async hasChanged(context: IActionContext): Promise<boolean> {
        let pollingDockerStatus: DockerStatus;
        let isDockerStatusChanged = false;

        try {
            this._itemsFromPolling = await this.getSortedItems(context);
            pollingDockerStatus = 'Running';
        } catch (error) {
            this.clearPollingCache();
            pollingDockerStatus = await dockerInstallStatusProvider.isDockerInstalled() ? 'Installed' : 'NotInstalled';
            isDockerStatusChanged = pollingDockerStatus !== this._currentDockerStatus;
        }

        const hasChanged = !this.areArraysEqual(this._currentItems, this._itemsFromPolling) || isDockerStatusChanged
        this._currentDockerStatus = pollingDockerStatus;
        return hasChanged;
    }

    private areArraysEqual(array1: TItem[] | undefined, array2: TItem[] | undefined): boolean {
        if (array1 === array2) {
            return true;
        } else if (array1 && array2) {
            if (array1.length !== array2.length) {
                return false;
            } else {
                return !array1.some((item1, index) => {
                    return getTreeId(item1) !== getTreeId(array2[index]);
                });
            }
        } else {
            return false;
        }
    }

    private showDockerInstallNotificationIfNeeded(): void {
        if (!dockerInstallNotificationShownToUser && this._currentDockerStatus === 'NotInstalled') {
            dockerInstallNotificationShownToUser = true;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            showDockerInstallNotification();
        }
    }
}

export function getTreeId(object: DockerObject): string {
    // Several of these aren't defined for all Docker objects, but the concatenation of whatever exists among them is enough to always be unique
    // *and* change the ID when the state of the object changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return `${object.Id}${object.Name}${(object as any).State}${(object as any).Current}${(object as any).Outdated}${(object as any).Status}`;
}
