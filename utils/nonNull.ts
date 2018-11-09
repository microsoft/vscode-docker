/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'azure-arm-containerregistry/lib/models';
import { Subscription } from 'azure-arm-resource/lib/subscription/models';
import { isNullOrUndefined } from 'util';

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
            "Internal error: Expected value to be neither null nor undefined"
            + (propertyNameOrMessage ? `: ${propertyNameOrMessage}` : ''));
    }

    return value;
}

export function getId(registry: Registry): string {
    return nonNullProp(registry, 'id');
}

export function getLoginServer(registry: Registry): string {
    return nonNullProp(registry, 'loginServer');
}

export function getTenantId(subscription: Subscription): string {
    return nonNullProp(subscription, 'tenantId');
}

export function getSubscriptionId(subscription: Subscription): string {
    return nonNullProp(subscription, 'subscriptionId');
}
