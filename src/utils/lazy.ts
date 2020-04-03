/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class Lazy<T> {
    private _isValueCreated: boolean = false;
    private _value: T | undefined;

    public constructor(private readonly valueFactory: () => T) {
    }

    public get isValueCreated(): boolean {
        return this._isValueCreated;
    }

    public get value(): T {
        if (!this._isValueCreated) {
            this._value = this.valueFactory();
            this._isValueCreated = true;
        }

        return this._value;
    }
}

export default Lazy;
