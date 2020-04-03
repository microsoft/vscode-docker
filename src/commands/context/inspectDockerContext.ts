/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyContent } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { dockerContextManager } from '../../utils/dockerContextManager';
import { selectDockerContext } from './selectDockerContext';

export async function inspectDockerContext(_actionContext: IActionContext): Promise<void> {
    const selectedContext = await selectDockerContext(localize('vscode-docker.commands.context.selectContextToInspect', 'Select Docker context to inspect'));

    const inspectResult = await dockerContextManager.inspect(selectedContext.Name);

    await openReadOnlyContent({
        label: `Docker context ${selectedContext.Name}`,
        fullId: `vscode-docker.dockerContext.${selectedContext.Name}`
    }, inspectResult, '');
}
