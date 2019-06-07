/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { AzureAccountTreeItem, validateAzureAccountInstalled } from "./azure/AzureAccountTreeItem";
import { DockerHubAccountTreeItem } from "./dockerHub/DockerHubAccountTreeItem";
import { PrivateRegistriesTreeItem } from "./private/PrivateRegistriesTreeItem";
import { isAncestoryOfRegistryType, RegistryType } from "./RegistryType";

export class RegistriesTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'registries';
    public contextValue: string = RegistriesTreeItem.contextValue;
    public label: string = 'Registries';
    public childTypeLabel: string = 'registry type';
    public autoSelectInTreeItemPicker: boolean = true;

    private _privateRegistriesTreeItem: PrivateRegistriesTreeItem;
    private _azureAccountTreeItemTask: Promise<AzureAccountTreeItem | undefined>;

    public constructor(parent: AzExtParentTreeItem | undefined) {
        super(parent);
        ext.dockerHubAccountTreeItem = new DockerHubAccountTreeItem(this);
        this._azureAccountTreeItemTask = AzureAccountTreeItem.create(this);
        this._privateRegistriesTreeItem = new PrivateRegistriesTreeItem(this);
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
        const result: AzExtTreeItem[] = [ext.dockerHubAccountTreeItem];

        const azureAccountTreeItem = await this._azureAccountTreeItemTask;
        if (azureAccountTreeItem) {
            result.push(azureAccountTreeItem);
        }

        result.push(this._privateRegistriesTreeItem);

        return result;
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(): number {
        return 0; // items already sorted
    }

    public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[]): Promise<AzExtTreeItem | undefined> {
        let matchesAzure = false;
        let matchesOther = false;
        for (const rt of Object.values(RegistryType)) {
            for (const val of expectedContextValues) {
                if (rt === RegistryType.azure) {
                    if (isAncestoryOfRegistryType(val, <RegistryType>rt)) {
                        matchesAzure = true;
                        break;
                    }
                } else if (isAncestoryOfRegistryType(val, <RegistryType>rt)) {
                    matchesOther = true;
                    break;
                }
            }
        }

        if (matchesAzure && !matchesOther) {
            return await validateAzureAccountInstalled();
        } else {
            return undefined;
        }
    }
}
