/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RuntimeManager } from './RuntimeManager';

export class OrchestratorRuntimeManager extends RuntimeManager {
    public readonly onOrchestratorRuntimeClientRegistered = this.runtimeClientRegisteredEmitter.event;
}
