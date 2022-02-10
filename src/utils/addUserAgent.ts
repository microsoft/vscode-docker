/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { appendExtensionUserAgent } from '@microsoft/vscode-azext-utils';
import { OutgoingHttpHeaders } from 'http';

const userAgentKey = 'User-Agent';

export function addUserAgent(options: { headers?: OutgoingHttpHeaders }): void {
    if (!options.headers) {
        options.headers = {};
    }

    const userAgent = appendExtensionUserAgent(<string>options.headers[userAgentKey]);
    options.headers[userAgentKey] = userAgent;
}
