/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LabelFilters } from "../../contracts/ContainerClient";
import { conditional } from "../../utils/conditional";
import { withDockerFilterArg } from "./withDockerFilterArg";

export function formatDockerLabelFilter(name: string, value: boolean | string): string | undefined {
    if (typeof value === 'boolean' && value) {
        return `label=${name}`;
    } else if (typeof value === 'string') {
        return conditional`label=${name}=${value}`;
    }

    return undefined;
}

export function withDockerLabelFilterArgs(labels?: LabelFilters) {
    return withDockerFilterArg(
        Object.entries(labels || {}).map(([label, value]) => formatDockerLabelFilter(label, value)),
    );
}
