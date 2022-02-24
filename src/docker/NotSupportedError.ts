/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../localize';

export class NotSupportedError extends Error {
    public static ErrorType: string = 'NotSupportedError';

    public constructor(context: IActionContext) {
        super(localize('vscode-docker.notSupportedError.contextNotSupported', 'This action is not supported in the current Docker context.'));
        context.errorHandling.suppressReportIssue = true;
    }
}
