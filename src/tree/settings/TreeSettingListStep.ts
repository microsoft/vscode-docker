/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { CommonTreeArraySetting, CommonTreeSetting, getTreeArraySetting, getTreeSetting, ITreeArraySettingInfo, ITreeSettingInfo } from "./commonTreeSettings";
import { ITreeSettingsWizardContext } from "./ITreeSettingsWizardContext";

export class TreeSettingListStep extends AzureWizardPromptStep<ITreeSettingsWizardContext> {
    private _settings: (ITreeSettingInfo<string> | ITreeArraySettingInfo<string>)[];

    public constructor(settings: (ITreeSettingInfo<string> | ITreeArraySettingInfo<string>)[]) {
        super();
        this._settings = settings;
    }

    public async prompt(context: ITreeSettingsWizardContext): Promise<void> {
        const placeHolder = "Select a setting to change."
        const picks = this._settings.map(s => {
            let currentValue: string | string[];
            if (Array.isArray(s.defaultProperty)) {
                currentValue = getTreeArraySetting(<ITreeArraySettingInfo<string>>s);
            } else {
                currentValue = getTreeSetting(<ITreeSettingInfo<string>>s);
            }

            return {
                label: `$(gear) ${getCommonTreeSettingLabel(s.setting)}`,
                description: `Current: "${currentValue.toString()}"`,
                detail: s.description,
                data: s
            };
        });
        context.settingInfo = (await ext.ui.showQuickPick(picks, { placeHolder, suppressPersistence: true, ignoreFocusOut: false })).data;
    }

    public shouldPrompt(context: ITreeSettingsWizardContext): boolean {
        return !context.settingInfo;
    }
}

function getCommonTreeSettingLabel(setting: CommonTreeSetting | CommonTreeArraySetting): string {
    switch (setting) {
        case 'groupBy':
            return 'Group By';
        case 'label':
            return 'Label';
        case 'description':
            return 'Description';
        case 'sortBy':
            return 'Sort By';
        default:
            throw new RangeError(`Unexpected setting "${setting}".`);
    }
}
