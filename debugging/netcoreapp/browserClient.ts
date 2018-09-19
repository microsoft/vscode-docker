/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as opn from 'opn';
import { Uri } from "vscode";

export interface BrowserClient {
    openBrowser(url: string): void;
}

export class OpnBrowserClient implements BrowserClient {
    public openBrowser(url: string): void {
        const uri = Uri.parse(url);

        if (uri.scheme === 'http' || uri.scheme === 'https') {
            opn(url);
        }
    }
}

export default OpnBrowserClient;
