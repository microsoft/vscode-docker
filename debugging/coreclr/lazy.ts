/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

export class Lazy<T> {
    private _isValueCreated: boolean = false;
    private _value: T | undefined;

    constructor(private readonly valueFactory: () => T) {
    }

    get isValueCreated(): boolean {
        return this._isValueCreated;
    }

    get value(): T {
        if (!this._isValueCreated) {
            this._value = this.valueFactory();
            this._isValueCreated = true;
        }

        return this._value;
    }
}

export default Lazy;
