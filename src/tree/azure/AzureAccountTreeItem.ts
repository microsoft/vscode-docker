/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, extensions } from "vscode";
import { AzExtParentTreeItem, AzureAccountTreeItemBase, ISubscriptionContext, UserCancelledError } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { treeUtils } from "../../utils/treeUtils";
import { isAncestoryOfRegistryType, RegistryType } from "../RegistryType";
import { SubscriptionTreeItem } from "./SubscriptionTreeItem";

const azureAccountExtensionId: string = 'ms-vscode.azure-account';

let azureAccountTreeItemTask: Promise<AzureAccountTreeItem | undefined>;

export class AzureAccountTreeItem extends AzureAccountTreeItemBase {
    private constructor(parent: AzExtParentTreeItem) {
        super(parent);
    }

    public static async create(parent: AzExtParentTreeItem): Promise<AzureAccountTreeItem | undefined> {
        azureAccountTreeItemTask = this.createInternal(parent);
        return await azureAccountTreeItemTask;
    }

    private static async createInternal(parent: AzExtParentTreeItem): Promise<AzureAccountTreeItem | undefined> {
        const azureAccountExtension = extensions.getExtension(azureAccountExtensionId);
        await commands.executeCommand('setContext', 'isAzureAccountInstalled', !!azureAccountExtension);
        if (azureAccountExtension) {
            if (!azureAccountExtension.isActive) {
                await azureAccountExtension.activate();
            }
            return new AzureAccountTreeItem(parent);
        } else {
            return undefined;
        }
    }

    public get iconPath(): string {
        return treeUtils.getIconPath('azure');
    }

    public createSubscriptionTreeItem(subContext: ISubscriptionContext): SubscriptionTreeItem {
        return new SubscriptionTreeItem(this, subContext);
    }

    public isAncestorOfImpl(expectedContextValue: string): boolean {
        return isAncestoryOfRegistryType(expectedContextValue, RegistryType.azure);
    }
}

export async function validateAzureAccountInstalled(): Promise<AzureAccountTreeItem> {
    const ti = await azureAccountTreeItemTask;
    if (ti) {
        return ti;
    } else {
        const message = "This functionality requires installing the Azure Account extension.";
        const viewInMarketplace = { title: "View in Marketplace" };
        if (await ext.ui.showWarningMessage(message, viewInMarketplace) === viewInMarketplace) {
            await commands.executeCommand('extension.open', azureAccountExtensionId);
        }

        throw new UserCancelledError();
    }
}
