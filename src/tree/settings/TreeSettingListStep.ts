/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IAzureQuickPickItem } from "@microsoft/vscode-azext-utils";
import { l10n } from 'vscode';
import { ITreeSettingsWizardContext, ITreeSettingWizardInfo } from "./ITreeSettingsWizardContext";

export class TreeSettingListStep extends AzureWizardPromptStep<ITreeSettingsWizardContext> {
    public async prompt(context: ITreeSettingsWizardContext): Promise<void> {
        const placeHolder = l10n.t('Select a setting to change.');
        const picks: IAzureQuickPickItem<ITreeSettingWizardInfo | undefined>[] = context.infoList.map(info => {
            return {
                label: l10n.t('$(gear) {0}', info.label),
                description: l10n.t('Current: "{0}"', info.currentValue?.toString()),
                detail: info.description,
                data: info
            };
        });
        picks.push({
            label: l10n.t('$(history) Reset settings'),
            detail: l10n.t('Restore settings to their original defaults.'),
            data: undefined
        });
        context.info = (await context.ui.showQuickPick(picks, { placeHolder, suppressPersistence: true, ignoreFocusOut: false })).data;
    }

    public shouldPrompt(context: ITreeSettingsWizardContext): boolean {
        return !context.info;
    }
}
