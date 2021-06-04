/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { openStartPageAfterExtensionUpdate } from "../../commands/startPage/openStartPage";
import { ScaffoldingWizardContext } from "./ScaffoldingWizardContext";

export class OpenStartPageStep extends AzureWizardExecuteStep<ScaffoldingWizardContext> {
    public constructor(public readonly priority: number) {
        super();
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public async execute(_wizardContext: ScaffoldingWizardContext, _progress: never): Promise<void> {
        // Wait for the page to be shown. This helps ensure that, if scaffolded files are to be opened,
        // they are opened last and are visible after the wizard is finished.
        await openStartPageAfterExtensionUpdate();
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public shouldExecute(_wizardContext: ScaffoldingWizardContext): boolean {
        return true;
    }
}
