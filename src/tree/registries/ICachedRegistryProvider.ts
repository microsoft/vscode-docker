/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryApi } from "./all/RegistryApi";

/**
 * Basic _non-sensitive_ information that will be cached across sessions
 */
export interface ICachedRegistryProvider {
    id: string;
    api: RegistryApi;
    url?: string;
    username?: string;
}
