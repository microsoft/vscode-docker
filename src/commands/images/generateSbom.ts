/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { ImageSbomItem } from '../../runtimes/docker';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';

export async function generateSbom(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: vscode.l10n.t('No images are available for generating sbom')
        });
    }

    const generating: string = vscode.l10n.t('Generating sbom...');

    let sbomResult: ImageSbomItem[];
    await vscode.window.withProgress( { location: vscode.ProgressLocation.Notification, title: generating }, async () => {
        sbomResult = await ext.runWithDefaults(client => client.imageGenerateSbom({ imageRef: node.imageId }));
    });

    await openReadOnlyJson(node, JSON.parse(sbomResult[0].raw));
}
