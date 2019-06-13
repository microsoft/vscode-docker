/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizard, IActionContext } from "vscode-azureextensionui";
import { ContainerDescription, ContainerLabel, ContainersGroupBy, ContainersSortBy } from "../../tree/containers/containersTreeSettings";
import { TreeSettingListStep } from "../../tree/settings/TreeSettingListStep";
import { TreeSettingStep } from "../../tree/settings/TreeSettingStep";

export async function configureContainersExplorer(context: IActionContext): Promise<void> {
    const wizard = new AzureWizard(context, {
        title: 'Configure containers explorer',
        promptSteps: [
            new TreeSettingListStep([ContainerLabel, ContainerDescription, ContainersGroupBy, ContainersSortBy]),
            new TreeSettingStep()
        ],
        hideStepCount: true
    });
    await wizard.prompt();
    await wizard.execute();
}
