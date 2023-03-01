/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { multiSelectNodes } from '../../utils/multiSelectNodes';

export async function pullImage(context: IActionContext, node?: ImageTreeItem, nodes?: ImageTreeItem[]): Promise<void> {
    nodes = await multiSelectNodes(
        { ...context, suppressCreatePick: true, noItemFoundErrorMessage: l10n.t('No images are available to pull') },
        ext.imagesTree,
        ImageTreeItem.contextValue,
        node,
        nodes
    );

    let noneTagWarningShown = false;

    const client = await ext.runtimeManager.getClient();
    const taskCRF = new TaskCommandRunnerFactory(
        {
            taskName: l10n.t('Pull images')
        }
    );

    for (const n of nodes) {
        // Images with <none> as a tag (i.e. they don't have a tag) can't be pulled so skip them
        if (/:<none>/i.test(n.fullTag)) {
            // Warn only once
            if (!noneTagWarningShown) {
                void context.ui.showWarningMessage(l10n.t('Images without tags will be skipped.'));
                noneTagWarningShown = true;
            }

            continue;
        }

        await taskCRF.getCommandRunner()(
            client.pullImage({ imageRef: n.fullTag })
        );
    }
}
