/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { Uri } from "vscode";
import { openExternal } from '../../../explorer/utils/openExternal';

export interface BrowserClient {
    openBrowser(url: string): void;
}

export class OpnBrowserClient implements BrowserClient {
    public openBrowser(url: string): void {
        const uri = Uri.parse(url);

        if (uri.scheme === 'http' || uri.scheme === 'https') {
            // tslint:disable-next-line:no-floating-promises
            openExternal(url);
        }
    }
}

export default OpnBrowserClient;
