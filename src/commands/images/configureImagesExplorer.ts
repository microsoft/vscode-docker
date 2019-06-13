/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizard, IActionContext } from "vscode-azureextensionui";
import { ImageDescription, ImageLabel, ImagesGroupBy, ImagesSortBy } from "../../tree/images/imagesTreeSettings";
import { TreeSettingListStep } from "../../tree/settings/TreeSettingListStep";
import { TreeSettingStep } from "../../tree/settings/TreeSettingStep";

export async function configureImagesExplorer(context: IActionContext): Promise<void> {
    const wizard = new AzureWizard(context, {
        title: 'Configure images explorer',
        promptSteps: [
            new TreeSettingListStep([ImageLabel, ImageDescription, ImagesGroupBy, ImagesSortBy]),
            new TreeSettingStep()
        ],
        hideStepCount: true
    });
    await wizard.prompt();
    await wizard.execute();
}
