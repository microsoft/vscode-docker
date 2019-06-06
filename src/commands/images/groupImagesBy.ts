/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationTarget, workspace, WorkspaceConfiguration } from 'vscode';
import { configPrefix, configurationKeys } from '../../constants';
import { ext, ImageGrouping } from '../../extensionVariables';

export async function groupImagesBy(): Promise<void> {
    let response = await ext.ui.showQuickPick(
        [
            { label: "No grouping", data: ImageGrouping.None },
            { label: "Group by repository", data: ImageGrouping.Repository },
            { label: "Group by repository name", data: ImageGrouping.RepositoryName },
            { label: "Group by image ID", data: ImageGrouping.ImageId },
        ],
        {
            placeHolder: "Select how to group the Images node entries"
        });

    ext.groupImagesBy = response.data;
    const configOptions: WorkspaceConfiguration = workspace.getConfiguration(configPrefix);
    configOptions.update(configurationKeys.groupImagesBy, ImageGrouping[ext.groupImagesBy], ConfigurationTarget.Global);
    await ext.imagesTree.refresh();
}
