/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export class TestMemento implements vscode.Memento {
    private readonly values: { [key: string]: never } = {};

    keys(): readonly string[] {
        return Object.keys(this.values);
    }

    get<T>(key: string, defaultValue?: T): T | undefined {
        return this.values[key] ?? defaultValue;
    }

    update(key: string, value: never): Thenable<void> {
        this.values[key] = value;
        return Promise.resolve();
    }
}
