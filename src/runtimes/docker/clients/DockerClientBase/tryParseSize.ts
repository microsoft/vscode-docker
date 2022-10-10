/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tries to parse a size (in many forms) into a value in bytes
 * @param value The value to try to parse into a size
 * @returns An integer value in bytes, if the input can be parsed, otherwise undefined
 */
export function tryParseSize(value: string | number | undefined | null): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    } else if (typeof value === 'number') {
        return Math.round(value);
    } else {
        if (value.toLowerCase() === 'n/a') {
            return undefined;
        } else {
            // Parses values like "1234", "1234b", "1234kb", "1234 MB", "12.34 GB" etc. into size (the numerical part)
            // and sizeUnit (the kb/mb/gb, if present)
            const result = /(?<size>\d+(\.\d+)?)\s*(?<sizeUnit>[kmg]?b)?/i.exec(value);

            if (result?.groups?.size) {
                const size: number = Number.parseFloat(result.groups.size);
                const unit: string | undefined = result.groups.sizeUnit;

                switch (unit?.toLowerCase()) {
                    case 'kb':
                        return Math.round(size * 1024);
                    case 'mb':
                        return Math.round(size * 1024 * 1024);
                    case 'gb':
                        return Math.round(size * 1024 * 1024 * 1024);
                    default:
                        return Math.round(size);
                }
            } else {
                return undefined;
            }
        }
    }
}
