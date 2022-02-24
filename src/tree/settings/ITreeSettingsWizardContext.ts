/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "./ITreeSettingInfo";

export interface ITreeSettingWizardInfo {
    setting: string;
    label: string;
    description: string;
    settingInfo: ITreeSettingInfo<string> | ITreeArraySettingInfo<string>;
    currentValue: string | string[];
}

export interface ITreeSettingsWizardContext extends IActionContext {
    infoList: ITreeSettingWizardInfo[];
    info?: ITreeSettingWizardInfo;
    newValue?: string | string[];
}
