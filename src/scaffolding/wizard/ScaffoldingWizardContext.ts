/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { Platform, PlatformOS } from '../../utils/platform';

export interface ScaffoldingWizardContext extends IActionContext {
    platform?: Platform;
    platformOs?: PlatformOS;
    ports?: number[];
    scaffoldCompose?: boolean;
    scaffoldDebug?: boolean;
}
