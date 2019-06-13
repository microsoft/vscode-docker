/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizard, IActionContext } from "vscode-azureextensionui";
import { TreeSettingListStep } from "../../tree/settings/TreeSettingListStep";
import { TreeSettingStep } from "../../tree/settings/TreeSettingStep";
import { VolumeDescription, VolumeLabel, VolumesGroupBy, VolumesSortBy } from "../../tree/volumes/volumeTreeSettings";

export async function configureVolumesExplorer(context: IActionContext): Promise<void> {
    const wizard = new AzureWizard(context, {
        title: 'Configure volumes explorer',
        promptSteps: [
            new TreeSettingListStep([VolumeLabel, VolumeDescription, VolumesGroupBy, VolumesSortBy]),
            new TreeSettingStep()
        ],
        hideStepCount: true
    });
    await wizard.prompt();
    await wizard.execute();
}
