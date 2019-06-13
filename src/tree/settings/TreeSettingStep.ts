/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationTarget } from "vscode";
import { AzureWizardPromptStep, IAzureQuickPickItem, IAzureQuickPickOptions } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { nonNullProp } from "../../utils/nonNull";
import { getTreeArraySetting, getTreeConfig, ITreeArraySettingInfo, ITreePropertyInfo } from "./commonTreeSettings";
import { ITreeSettingsWizardContext } from "./ITreeSettingsWizardContext";

export class TreeSettingStep extends AzureWizardPromptStep<ITreeSettingsWizardContext> {
    public async prompt(context: ITreeSettingsWizardContext): Promise<void> {
        const settingInfo = nonNullProp(context, 'settingInfo');
        context.telemetry.properties.setting = settingInfo.setting;

        let picks: IAzureQuickPickItem<string>[] = settingInfo.properties.map(convertPropertyInfoToPick);
        picks = picks.sort((p1, p2) => p1.label.localeCompare(p2.label));

        let options: IAzureQuickPickOptions = {
            placeHolder: settingInfo.description,
            suppressPersistence: true
        }

        options.canPickMany = Array.isArray(settingInfo.defaultProperty);
        if (options.canPickMany) {
            const currentValue = getTreeArraySetting(<ITreeArraySettingInfo<string>>settingInfo);
            options.isPickSelected = (p: Partial<IAzureQuickPickItem>) => currentValue.includes(p.data);
        }

        const result: IAzureQuickPickItem<string> | IAzureQuickPickItem<string>[] = await ext.ui.showQuickPick(picks, options);
        let newValue: string | string[];
        if (Array.isArray(result)) {
            newValue = result.map((p: IAzureQuickPickItem) => p.data);
        } else {
            newValue = result.data;
        }
        context.telemetry.properties.newValue = newValue.toString();
        getTreeConfig(settingInfo).update(settingInfo.setting, newValue, ConfigurationTarget.Global);
    }

    public shouldPrompt(_context: ITreeSettingsWizardContext): boolean {
        return true;
    }
}

function convertPropertyInfoToPick(info: ITreePropertyInfo<string>): IAzureQuickPickItem<string> {
    let description: string;
    let detail: string;
    if (info.exampleValue) {
        description = `e.g. "${info.exampleValue}"`;
        detail = info.description;
    } else {
        description = info.description;
    }

    return {
        label: info.property,
        description,
        detail,
        data: info.property
    };
}
