/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Labels } from "../../contracts/ContainerClient";

/**
 * Parse Docker-like label string
 * @param rawLabels Comma seperated string of labels
 * @returns A {@link Labels} record
 */
export function parseDockerLikeLabels(rawLabels: string): Labels {
    return rawLabels.split(',').reduce((labels, labelPair) => {
        const index = labelPair.indexOf('=');
        labels[labelPair.substring(0, index)] = labelPair.substring(index + 1);
        return labels;
    }, {} as Labels);
}
