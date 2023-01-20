/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const AllPlatformOSs = ['Windows', 'Linux', 'Mac'] as const;
export const AllPlatforms = [
    'Node.js',
    '.NET: ASP.NET Core',
    '.NET: Console',
    'Python: Django',
    'Python: FastAPI',
    'Python: Flask',
    'Python: General',
    'Java',
    'C++',
    'Go',
    'Ruby',
    'Other'
] as const;

type PlatformOSTuple = typeof AllPlatformOSs;
export type PlatformOS = PlatformOSTuple[number];

type PlatformTuple = typeof AllPlatforms;
export type Platform = PlatformTuple[number];
