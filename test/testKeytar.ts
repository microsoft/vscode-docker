/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IKeytar } from "../utils/keytar";

export class TestKeytar implements IKeytar {
    private _services: Map<string, Map<string, string>> = new Map<string, Map<string, string>>();

    public async getPassword(service: string, account: string): Promise<string> {
        await this.delay();
        let foundService = this._services.get(service);
        if (foundService) {
            return foundService.get(account);
        }

        return undefined;
    }

    public async setPassword(service: string, account: string, password: string): Promise<void> {
        await this.delay();
        let foundService = this._services.get(service);
        if (!foundService) {
            foundService = new Map<string, string>();
            this._services.set(service, foundService);
        }

        foundService.set(account, password);
    }

    public async deletePassword(service: string, account: string): Promise<boolean> {
        await this.delay();
        let foundService = this._services.get(service);
        if (foundService) {
            if (foundService.has(account)) {
                foundService.delete(account);
                return true;
            }
        }

        return false;
    }

    private async delay(): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, 1);
        });
    }
}
