/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as assertEx from './assertEx';
import { IActionContext } from 'vscode-azureextensionui';
import { Suite, Test, Context } from 'mocha';
import { addImageTaggingTelemetry } from '../commands/tag-image';

const registryContainerName = 'test-registry';

suite("Tagging telemetry", async function (this: Suite): Promise<void> {
    suite("Registry type", async () => {
        function testRegistryType(imageNameNoTag: string, expectedRegistryType: string): void {
            test(`${imageNameNoTag} -> ${expectedRegistryType}`, () => {
                let actionContext: IActionContext = {
                    properties: {
                        cancelStep: '',
                        error: '',
                        errorMessage: '',
                        isActivationEvent: 'false',
                        result: 'Succeeded',
                    },
                    measurements: {
                        duration: 1
                    },
                    suppressErrorDisplay: false,
                    suppressTelemetry: false,
                    rethrowError: false
                };

                addImageTaggingTelemetry(actionContext, imageNameNoTag, '.before');
                assert.equal(actionContext.properties["registryType.before"], expectedRegistryType, "Incorrect registry type");

                addImageTaggingTelemetry(actionContext, imageNameNoTag, '.after');
                assert.equal(actionContext.properties["registryType.after"], expectedRegistryType, "Incorrect registry type");

                addImageTaggingTelemetry(actionContext, `${imageNameNoTag}:latest`, '.after');
                assert.equal(actionContext.properties["registryType.after"], expectedRegistryType, "Incorrect registry type");

                addImageTaggingTelemetry(actionContext, `${imageNameNoTag}:2.0`, '.after');
                assert.equal(actionContext.properties["registryType.after"], expectedRegistryType, "Incorrect registry type");
            });
        }

        testRegistryType('samhouston/hello-world', 'dockerhub-namespace');

        testRegistryType('docker.io/markmichaelby/hello-world', 'dockerhub-dockerio');

        //testRegistryType('docker.io/markmichaelby/hello-world', 'gitlab');

        // { type: 'gitlab', regex: /gitlab.*\// },
        // { type: 'ACR', regex: /azurecr\.io.*\// },
        // { type: 'GCR', regex: /gcr\.io.*\// },
        // { type: 'ECR', regex: /\.ecr\..*\// },
        // { type: 'localhost', regex: /localhost:.*\// },

        testRegistryType('127.0.0.1:5000/hello-world:latest', 'privateWithPort');

        testRegistryType('127.0.0.1/hello-world:latest', 'other');
        testRegistryType('hello-world:latest', 'none');
        testRegistryType('hello-world', 'none');
    });
});
