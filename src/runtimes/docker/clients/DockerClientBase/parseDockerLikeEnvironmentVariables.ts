/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Parse the standard Docker environment variable format into a key value record object
 * @param environmentVariables A Docker like list of key=value environment variables
 * @returns An object of key value pairs for the environment variables
 */
export function parseDockerLikeEnvironmentVariables(environmentVariables: Array<string>): Record<string, string> {
    return environmentVariables.reduce<Record<string, string>>((evs, ev) => {
        const index = ev.indexOf('=');
        if (index > -1) {
            const name = ev.slice(0, index);
            const value = ev.slice(index + 1);

            return {
                ...evs,
                [name]: value,
            };
        }

        return evs;
    }, {});
}
