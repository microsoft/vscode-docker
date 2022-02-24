/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { RegistryApi } from "./all/RegistryApi";
import { IConnectRegistryWizardOptions } from "./connectWizard/IConnectRegistryWizardOptions";
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";
import { IRegistryProviderTreeItem } from "./IRegistryProviderTreeItem";

export interface IRegistryProvider {
    /**
     * A unique id for this registry provider
     */
    id: string;

    /**
     * The api used by this provider
     */
    api: RegistryApi;

    /**
     * Primary value to display when prompting a user to connect a provider
     */
    label: string;

    /**
     * Optional secondary value to display when prompting a user to connect a provider
     */
    description?: string;

    /**
     * Optional tertiary value to display when prompting a user to connect a provider
     */
    detail?: string;

    /**
     * Set to true if this provider maps to a single registry as opposed to multiple registries
     * If it maps to a single registry, it will be grouped under a "Connected Registries" node in the tree.
     */
    isSingleRegistry?: boolean;

    /**
     * Set to true if only a single instance of this provider can be connected at a time
     */
    onlyOneAllowed?: boolean;

    /**
     * Describes the wizard to be used when connecting this provider
     */
    connectWizardOptions?: IConnectRegistryWizardOptions;

    /**
     * The factory method for creating the root tree item
     */
    treeItemFactory(parent: AzExtParentTreeItem, cachedProvider: ICachedRegistryProvider): (AzExtParentTreeItem & IRegistryProviderTreeItem) | Promise<AzExtParentTreeItem & IRegistryProviderTreeItem>;

    /**
     * Method to call for persisting auth secrets
     */
    persistAuth?(cachedProvider: ICachedRegistryProvider, secret: string): Promise<void>;

    /**
     * Method to call to remove auth secrets
     */
    removeAuth?(cachedProvider: ICachedRegistryProvider): Promise<void>;
}
