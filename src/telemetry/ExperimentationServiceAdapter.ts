/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IExperimentationService } from 'vscode-tas-client';
import * as tas from 'vscode-tas-client';
import { extensionId } from '../constants';
import { ext } from '../extensionVariables';
import { AsyncLazy } from '../utils/lazy';
import { TelemetryReporterProxy } from "./TelemetryReporterProxy";

// Use a lazy lifetime of 30 minutes which matches what TAS does
const lazyLifetime: number = 30 * 60 * 1000;

export interface IExperimentationServiceAdapter {
    isFlightEnabled(flight: string): Promise<boolean>;
}

export class ExperimentationServiceAdapter implements IExperimentationServiceAdapter {
    private readonly wrappedExperimentationService: IExperimentationService;
    private readonly flightMap: Map<string, AsyncLazy<boolean>> = new Map<string, AsyncLazy<boolean>>();

    public constructor(globalState: vscode.Memento, reporter: TelemetryReporterProxy) {
        const extensionVersion = this.getExtensionVersion();
        let targetPopulation: tas.TargetPopulation;

        if (ext.runningTests) {
            targetPopulation = tas.TargetPopulation.Team;
        } else if (/alpha/ig.test(extensionVersion)) {
            targetPopulation = tas.TargetPopulation.Insiders;
        } else {
            targetPopulation = tas.TargetPopulation.Public;
        }

        this.wrappedExperimentationService = tas.getExperimentationService(
            extensionId,
            extensionVersion,
            targetPopulation,
            reporter,
            globalState
        );
    }

    public async isFlightEnabled(flight: string): Promise<boolean> {
        if (!this.flightMap.has(flight)) {
            this.flightMap[flight] = new AsyncLazy<boolean>(async () => {
                return await this.wrappedExperimentationService.isFlightEnabledAsync(flight);
            }, lazyLifetime);
        }

        return await this.flightMap.get(flight).getValue();
    }

    private getExtensionVersion(): string {
        const extension = vscode.extensions.getExtension(extensionId);
        // eslint-disable-next-line @typescript-eslint/tslint/config
        return extension?.packageJSON?.version ?? '1';
    }
}
