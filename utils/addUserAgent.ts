/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OutgoingHttpHeaders } from 'http';
import { appendExtensionUserAgent } from 'vscode-azureextensionui';

const userAgentKey = 'User-Agent';

export function addUserAgent(options: { headers?: OutgoingHttpHeaders }): void {
    // tslint:disable-next-line:no-any
    if (!options.headers) {
        options.headers = {};
    }

    let userAgent = appendExtensionUserAgent(<string>options.headers[userAgentKey]);
    options.headers[userAgentKey] = userAgent;
}
