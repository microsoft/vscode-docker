/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ShellStreamCommandRunnerFactory, ShellStreamCommandRunnerOptions } from '@microsoft/container-runtimes';
import { withDockerEnvSettings } from '../../utils/withDockerEnvSettings';

export class DefaultEnvShellStreamCommandRunnerFactory<TOptions extends Omit<ShellStreamCommandRunnerOptions, 'env'>> extends ShellStreamCommandRunnerFactory<TOptions & { env: NodeJS.ProcessEnv }> {
    public constructor(options: TOptions) {
        super({
            ...options,
            env: withDockerEnvSettings(process.env),
        });
    }
}
