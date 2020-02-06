/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IClock {
    now(): Date;
}

export default class RealClock implements IClock {
    public now(): Date {
        return new Date();
    }
}
