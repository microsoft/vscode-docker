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
    private wrappedExperimentationService: IExperimentationService;

    private constructor() { }

    public static async create(globalState: vscode.Memento, reporter: tas.IExperimentationTelemetry): Promise<IExperimentationServiceAdapter> {
        const result = new ExperimentationServiceAdapter();

        if (ext.telemetryOptIn) {
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

                result.wrappedExperimentationService = await tas.getExperimentationServiceAsync(
                    extensionId,
                    version,
                    targetPopulation,
                    reporter,
                    globalState,
                );
            } catch { } // Best effort
        }

        return result;
    }

    public async isFlightEnabled(flight: string): Promise<boolean> {
        if (!this.wrappedExperimentationService) {
            return false;
        }

        return this.wrappedExperimentationService.isCachedFlightEnabled(flight);
    }
}
