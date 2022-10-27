/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * The prefix names for each of the tree views
 * Note: the help tree is intentionally excluded because it has no refresh nor config capabilities
 */
export const AllTreePrefixes = ['containers', 'networks', 'images', 'registries', 'volumes', 'contexts'] as const;

/**
 * A union type representing the tree prefix options
 */
export type TreePrefix = (typeof AllTreePrefixes)[number];
