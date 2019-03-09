/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerDesc } from 'dockerode';

export function getContainerLabel(container: ContainerDesc, labelTemplate: string): string {
    let image = container.Image;
    let name = container.Names[0].substr(1); // Remove start '/'
    let status = container.Status;

    let label = labelTemplate
        .replace('{image}', image)
        .replace('{name}', name)
        .replace('{status}', status);
    return label;
}
