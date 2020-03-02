/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isNullOrUndefined } from 'util';
import { localize } from '../localize';

/**
 * Retrieves a property by name from an object and checks that it's not null and not undefined.  It is strongly typed
 * for the property and will give a compile error if the given name is not a property of the source.
 */
export function nonNullProp<TSource, TKey extends keyof TSource>(source: TSource, name: TKey): NonNullable<TSource[TKey]> {
    let value = <NonNullable<TSource[TKey]>>source[name];
    return nonNullValue(value, <string>name);
}

/**
 * Validates that a given value is not null and not undefined.
 */
export function nonNullValue<T>(value: T | undefined, propertyNameOrMessage?: string): T {
    if (isNullOrUndefined(value)) {
        throw new Error(
            // tslint:disable-next-line:prefer-template
            localize('vscode-docker.utils.nonNull.expectedNull', 'Internal error: Expected value to be neither null nor undefined')
            + (propertyNameOrMessage ? `: ${propertyNameOrMessage}` : ''));
    }

    return value;
}

/**
 * Validates that a given object is not null and not undefined.
 * Then retrieves a property by name from that object and checks that it's not null and not undefined.  It is strongly typed
 * for the property and will give a compile error if the given name is not a property of the source.
 */
export function nonNullValueAndProp<TSource, TKey extends keyof TSource>(source: TSource | undefined, name: TKey): NonNullable<TSource[TKey]> {
    return nonNullProp(nonNullValue(source, <string>name), name);
}
