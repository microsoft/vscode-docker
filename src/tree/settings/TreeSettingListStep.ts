/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IAzureQuickPickItem } from "@microsoft/vscode-azext-utils";
import { localize } from '../../localize';
import { ITreeSettingWizardInfo, ITreeSettingsWizardContext } from "./ITreeSettingsWizardContext";

export class TreeSettingListStep extends AzureWizardPromptStep<ITreeSettingsWizardContext> {
    public async prompt(context: ITreeSettingsWizardContext): Promise<void> {
        const placeHolder = localize('vscode-docker.tree.settings.select', 'Select a setting to change.');
        const picks: IAzureQuickPickItem<ITreeSettingWizardInfo | undefined>[] = context.infoList.map(info => {
            return {
                label: localize('vscode-docker.tree.settings.currentLabel', '$(gear) {0}', info.label),
                description: localize('vscode-docker.tree.settings.currentValue', 'Current: "{0}"', info.currentValue?.toString()),
                detail: info.description,
                data: info
            };
        });
        picks.push({
            label: localize('vscode-docker.tree.settings.resetLabel', '$(history) Reset settings'),
            detail: localize('vscode-docker.tree.settings.resetDetail', 'Restore settings to their original defaults.'),
            data: undefined
        });
        context.info = (await context.ui.showQuickPick(picks, { placeHolder, suppressPersistence: true, ignoreFocusOut: false })).data;
    }

    public shouldPrompt(context: ITreeSettingsWizardContext): boolean {
        return !context.info;
    }
}
