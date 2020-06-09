/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IExperimentationService } from 'vscode-tas-client';
import * as tas from 'vscode-tas-client';
import { extensionId, extensionVersion } from '../constants';
import { ext } from '../extensionVariables';

export interface IExperimentationServiceAdapter {
    isFlightEnabled(flight: string): Promise<boolean>;
}

export class ExperimentationServiceAdapter implements IExperimentationServiceAdapter {
    private readonly wrappedExperimentationService: IExperimentationService;

    public constructor(globalState: vscode.Memento, reporter: tas.IExperimentationTelemetry) {
        if (!ext.telemetryOptIn) {
            return;
        }

        try {
            const version = extensionVersion.value ?? '1';
            let targetPopulation: tas.TargetPopulation;

            if (ext.runningTests || process.env.DEBUGTELEMETRY || process.env.VSCODE_DOCKER_TEAM === '1') {
                targetPopulation = tas.TargetPopulation.Team;
            } else if (/alpha/ig.test(version)) {
                targetPopulation = tas.TargetPopulation.Insiders;
            } else {
                targetPopulation = tas.TargetPopulation.Public;
            }

            this.wrappedExperimentationService = tas.getExperimentationService(
                extensionId,
                version,
                targetPopulation,
                reporter,
                globalState,
            );

            // Calling this will ensure the TAS web request is made and a telemetry event with flighting info is fired for (nearly) every session
            // Don't wait on it though
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.wrappedExperimentationService.isFlightEnabledAsync('vscode-docker.dummy');
        } catch { } // Best effort
    }

    public async isFlightEnabled(flight: string): Promise<boolean> {
        if (!this.wrappedExperimentationService) {
            return false;
        }

        return this.wrappedExperimentationService.isCachedFlightEnabled(flight);
    }
}
