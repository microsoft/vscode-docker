/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, GenericTreeItem, parseError } from "vscode-azureextensionui";
import { getThemedIconPath } from "../IconPath";
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";
import { IRegistryProvider } from "./IRegistryProvider";

export class RegistryConnectErrorTreeItem extends GenericTreeItem {
    public constructor(parent: AzExtParentTreeItem, err: unknown, public readonly cachedProvider: ICachedRegistryProvider, public readonly provider: IRegistryProvider) {
        super(parent, {
            label: parseError(err).message,
            contextValue: 'registryConnectError',
            iconPath: getThemedIconPath('statusWarning')
        });
    }
}
