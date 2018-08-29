/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as keytarType from 'keytar';
import { getCoreNodeModule } from './getCoreNodeModule';

export interface IKeytar {
    /**
     * Get the stored password for the service and account.
     *
     * @param service The string service name.
     * @param account The string account name.
     *
     * @returns A promise for the password string.
     */
    getPassword(service: string, account: string): Promise<string | null>;

    /**
     * Add the password for the service and account to the keychain.
     *
     * @param service The string service name.
     * @param account The string account name.
     * @param password The string password.
     *
     * @returns A promise for the set password completion.
     */
    setPassword(service: string, account: string, password: string): Promise<void>;

    /**
     * Delete the stored password for the service and account.
     *
     * @param service The string service name.
     * @param account The string account name.
     *
     * @returns A promise for the deletion status. True on success.
     */
    deletePassword(service: string, account: string): Promise<boolean>;
}

/**
 * Returns the keytar module installed with vscode
 */
function getKeytarModule(): typeof keytarType {
    const keytar: typeof keytarType | undefined = getCoreNodeModule('keytar');
    if (!keytar) {
        throw new Error("Internal error: Could not find keytar module for reading and writing passwords");
    } else {
        return keytar;
    }
}

export class Keytar implements IKeytar {
    private constructor(private _keytar: typeof keytarType) {
    }

    public static tryCreate(): Keytar | undefined {
        let keytar: typeof keytarType = getKeytarModule();
        if (keytar) {
            return new Keytar(keytar);
        } else {
            return undefined;
        }
    }

    public async getPassword(service: string, account: string): Promise<string> {
        return await this._keytar.getPassword(service, account);
    }

    public async setPassword(service: string, account: string, password: string): Promise<void> {
        await this._keytar.setPassword(service, account, password);
    }

    public async deletePassword(service: string, account: string): Promise<boolean> {
        return await this._keytar.deletePassword(service, account);
    }
}
