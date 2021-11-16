/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AsyncLazy } from '../utils/lazy';

class DockerCommandProvider {
    public readonly backgroundCommand: AsyncLazy<string>;
    public readonly foregroundCommand: AsyncLazy<string>;
    public readonly composeCommand: AsyncLazy<string>;

    public readonly dockerInstalled: AsyncLazy<boolean>;
    public readonly composeInstalled: AsyncLazy<boolean>;
    public readonly composeV2Installed: AsyncLazy<boolean>;

    public refresh(): void {
        // TODO
    }
}

export const dockerCommandProvider = new DockerCommandProvider();
