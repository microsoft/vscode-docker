/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as gradleParser from 'gradle-to-js/lib/parser';
import * as xml2js from 'xml2js';
import { GatherInformationStep } from '../GatherInformationStep';
import { JavaScaffoldingWizardContext } from './JavaScaffoldingWizardContext';

interface PomContents {
    project?: {
        version?: string;
        artifactid?: string;
    };
}

interface GradleContents {
    archivesBaseName?: string;
    jar?: { version?: string; archiveName?: string; baseName?: string; };
    version?: string;
}

export class JavaGatherInformationStep extends GatherInformationStep<JavaScaffoldingWizardContext> {
    private javaProjectType: 'pom' | 'gradle' | 'unknown' = 'unknown';

    public async prompt(wizardContext: JavaScaffoldingWizardContext): Promise<void> {
        if (wizardContext.artifact) {
            // If an artifact exists, it's a POM or Gradle file, we can find some info in there
            const contents = await fse.readFile(wizardContext.artifact, 'utf-8');

            if (/pom.xml$/i.test(wizardContext.artifact)) {
                // If it's a POM file, parse as XML
                this.javaProjectType = 'pom';
                const pomObject = <PomContents>await xml2js.parseStringPromise(contents, { trim: true, normalizeTags: true, normalize: true, mergeAttrs: true });

                wizardContext.version = pomObject?.project?.version || '0.0.1';

                if (pomObject?.project?.artifactid) {
                    wizardContext.relativeJavaOutputPath = `target/${pomObject.project.artifactid}-${wizardContext.version}.jar`;
                }
            } else {
                // Otherwise it's a gradle file, parse with that
                this.javaProjectType = 'gradle';
                const gradleObject = <GradleContents>await gradleParser.parseText(contents);

                wizardContext.version = gradleObject?.jar?.version || gradleObject?.version || '0.0.1';

                if (gradleObject?.jar?.archiveName) {
                    wizardContext.relativeJavaOutputPath = `build/libs/${gradleObject.jar.archiveName}`;
                } else if (gradleObject?.jar?.baseName) {
                    wizardContext.relativeJavaOutputPath = `build/libs/${gradleObject.jar.baseName}-${wizardContext.version}.jar`;
                } else if (gradleObject?.archivesBaseName) {
                    wizardContext.relativeJavaOutputPath = `build/libs/${gradleObject.archivesBaseName}-${wizardContext.version}.jar`;
                } else {
                    wizardContext.relativeJavaOutputPath = `build/libs/${wizardContext.workspaceFolder.name}-${wizardContext.version}.jar`;
                }
            }
        }

        await super.prompt(wizardContext);

        if (!wizardContext.relativeJavaOutputPath) {
            // If the artifact is not set (fell through the above if/else), it will just be the service name + .jar
            wizardContext.relativeJavaOutputPath = `${wizardContext.serviceName}.jar`;
        }

        wizardContext.debugPorts = [5005];
    }

    public shouldPrompt(wizardContext: JavaScaffoldingWizardContext): boolean {
        return !wizardContext.relativeJavaOutputPath;
    }

    protected setTelemetry(wizardContext: JavaScaffoldingWizardContext): void {
        wizardContext.telemetry.properties.javaProjectType = this.javaProjectType;
    }
}
