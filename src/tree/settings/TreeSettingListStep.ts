/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { ITreeSettingsWizardContext } from "./ITreeSettingsWizardContext";

export class TreeSettingListStep extends AzureWizardPromptStep<ITreeSettingsWizardContext> {
    public async prompt(context: ITreeSettingsWizardContext): Promise<void> {
        const placeHolder = "Select a setting to change."
        const picks = context.infoList.map(info => {
            return {
                label: `$(gear) ${info.label}`,
                description: `Current: "${info.currentValue}"`,
                detail: info.description,
                data: info
            }
        })
        context.info = (await ext.ui.showQuickPick(picks, { placeHolder, suppressPersistence: true, ignoreFocusOut: false })).data;
    }

    public shouldPrompt(context: ITreeSettingsWizardContext): boolean {
        return !context.info;
    }
}
