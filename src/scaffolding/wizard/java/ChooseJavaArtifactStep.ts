/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from "../../../localize";
import { ChooseArtifactStep } from "../ChooseArtifactStep";
import { ScaffoldingWizardContext } from "../ScaffoldingWizardContext";

export class ChooseJavaArtifactStep extends ChooseArtifactStep<ScaffoldingWizardContext> {
    public constructor() {
        super(
            localize('vscode-docker.scaffold.chooseJavaArtifactStep.promptText', 'Choose a build metadata file (pom.xml or build.gradle)'),
            ['**/[Pp][Oo][Mm].[Xx][Mm][Ll]', '**/[Bb][Uu][Ii][Ll][Dd].[Gg][Rr][Aa][Dd][Ll][Ee]'],
            localize('vscode-docker.scaffold.chooseJavaArtifactStep.noItemsFound', 'No build metadata files were found.')
        );
    }

    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        // Java's behavior is to look for a POM or Gradle file, but if none is present no error is thrown
        try {
            await super.prompt(wizardContext);
        } catch { } // Not a problem
    }
}
