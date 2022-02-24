/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, GenericTreeItem, parseError } from "@microsoft/vscode-azext-utils";
import { ThemeColor, ThemeIcon } from "vscode";
import { getRegistryProviders } from "./all/getRegistryProviders";
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";
import { IRegistryProvider } from "./IRegistryProvider";

export class RegistryConnectErrorTreeItem extends GenericTreeItem {
    public constructor(parent: AzExtParentTreeItem, err: unknown, public readonly cachedProvider: ICachedRegistryProvider, public readonly url?: string) {
        super(parent, {
            label: parseError(err).message,
            contextValue: 'registryConnectError',
            iconPath: new ThemeIcon('warning', new ThemeColor('problemsWarningIcon.foreground')),
        });

        this.provider = getRegistryProviders().find(rp => rp.id === this.cachedProvider.id);
    }

    public readonly provider: IRegistryProvider;
}
