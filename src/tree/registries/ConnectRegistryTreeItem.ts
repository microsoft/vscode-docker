/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommonRegistryItem, isCommonRegistryItem } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';
import { UnifiedRegistryItem } from "./UnifiedRegistryTreeDataProvider";

export const ConnectRegistryContextValue: string = 'connectregistry';

export function isConnectRegistryTreeItem(item: unknown): item is UnifiedRegistryItem<CommonRegistryItem> {
    return isCommonRegistryItem(item) && item.type === ConnectRegistryContextValue;
}

/**
 * Creates a tree item that can be used to connect a new registry
 */
export function getConnectRegistryTreeItem(): UnifiedRegistryItem<CommonRegistryItem> {
    return {
        provider: undefined,
        parent: undefined,
        wrappedItem: {
            label: vscode.l10n.t('Connect Registry...'),
            type: ConnectRegistryContextValue,
            iconPath: new vscode.ThemeIcon('plug'),
            command: {
                command: 'vscode-docker.registries.connectRegistry'
            },
            parent: undefined
        }
    };
}
