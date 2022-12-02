/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjsinner from 'dayjs';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import * as utc from 'dayjs/plugin/utc';

dayjsinner.extend(customParseFormat);
dayjsinner.extend(utc);

const defaultFormats = ['YYYY-MM-DD HH:mm:ss ZZ'];

/**
 * Wrap the dayjs methods to apply a default Docker friendly format to all parsing
 */
export const dayjs = new Proxy(dayjsinner, {
    apply(target, thisArg, argArray: Parameters<typeof dayjsinner>) {
        const formats = [...defaultFormats]; // formats should always include default Docker date format
        if (argArray.length > 1) {
            if (typeof argArray[1] === 'string' || Array.isArray(argArray[1])) {
                argArray[1] = formats.concat(argArray[1]);
            }
        } else if (argArray.length === 1) {
            argArray.push(formats);
        }

        return target.apply(thisArg, argArray);
    },
    get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
            if (prop === 'utc') {
                return function (this: typeof dayjsinner, ...args: Array<unknown>) {
                    const formats = [...defaultFormats]; // formats should always include default Docker date format
                    if (args.length > 1) {
                        if (typeof args[1] === 'string' || Array.isArray(args[1])) {
                            args[1] = formats.concat(args[1]);
                        }
                    } else if (args.length === 1) {
                        args.push(formats);
                    }

                    return value.apply(this === receiver ? target : this, args);
                };
            }

            return value.bind(this === receiver ? target : this);
        } else {
            return value;
        }
    },
});
