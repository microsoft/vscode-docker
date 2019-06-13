/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "./commonTreeSettings";

export interface ITreeSettingsWizardContext extends IActionContext {
    settingInfo?: ITreeSettingInfo<string> | ITreeArraySettingInfo<string>;
}
