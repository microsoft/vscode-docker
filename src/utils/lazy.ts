/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class Lazy<T> {
    private _isValueCreated: boolean = false;
    private _value: T | undefined;

    public constructor(private readonly valueFactory: () => T, private readonly _valueLifetime?: number) {
    }

    public get isValueCreated(): boolean {
        return this._isValueCreated;
    }

    public get value(): T {
        if (this._isValueCreated) {
            return this._value;
        }

        this._value = this.valueFactory();
        this._isValueCreated = true;

        if (this._valueLifetime) {
            const reset = setTimeout(() => {
                this._isValueCreated = false;
                this._value = undefined;
                clearTimeout(reset);
            }, this._valueLifetime);
        }

        return this._value;
    }
}

export class AsyncLazy<T> {
    private _isValueCreated: boolean = false;
    private _value: T | undefined;
    private _valuePromise: Promise<T> | undefined;

    public constructor(private readonly valueFactory: () => Promise<T>, private readonly _valueLifetime?: number) {
    }

    public get isValueCreated(): boolean {
        return this._isValueCreated;
    }

    public async getValue(): Promise<T> {
        if (this._isValueCreated) {
            return this._value;
        }

        const isPrimaryPromise = this._valuePromise === undefined; // The first caller is "primary"

        if (isPrimaryPromise) {
            this._valuePromise = this.valueFactory();
        }

        const result = await this._valuePromise;

        if (isPrimaryPromise) {
            this._value = result;
            this._valuePromise = undefined;
            this._isValueCreated = true;
        }

        if (this._valueLifetime && isPrimaryPromise) {
            const reset = setTimeout(() => {
                // Will only clear out values if there isn't a currently-running Promise
                // If there is, this timer will skip, but when that Promise finishes it will go through this code and register a new timer
                if (this._valuePromise === undefined) {
                    this._isValueCreated = false;
                    this._value = undefined;
                }

                clearTimeout(reset);
            }, this._valueLifetime);
        }

        return result;
    }
}
