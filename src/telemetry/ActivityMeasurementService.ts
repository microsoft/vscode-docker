/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AsyncLazy } from '../utils/lazy';

const defaultMeasurement: ActivityMeasurement = {
    lastSession: undefined,
    monthlySessions: 0,
    totalSessions: 0,
};

export type ActivityType = 'edit' | 'command' | 'explorer' | 'debug' | 'overall';

export interface IActivityMeasurementService {
    recordActivity(type: ActivityType): Promise<void>;
    getActivity(type: ActivityType): ActivityMeasurement;
}

export interface ActivityMeasurement {
    lastSession: number | undefined;
    monthlySessions: number;
    totalSessions: number;
}

export class ActivityMeasurementService implements IActivityMeasurementService {
    private readonly lazySetterMap: Map<ActivityType, AsyncLazy<void>> = new Map<ActivityType, AsyncLazy<void>>();
    private readonly values: Map<ActivityType, ActivityMeasurement> = new Map<ActivityType, ActivityMeasurement>();

    public constructor(private readonly memento: vscode.Memento) {
    }

    /**
     * Records activity. Once per session (max 1 per day), it will increment the monthly and total session counts and set the date of the last session to now.
     * Calling with any type will also result in 'overall' activity being incremented.
     * @param type The activity type to record measurements for
     */
    public async recordActivity(type: ActivityType): Promise<void> {
        if (!this.lazySetterMap.has(type)) {
            this.lazySetterMap[type] = new AsyncLazy(async () => {
                const currentValue = this.getActivity(type);
                const now = Date.now();

                // No need to increment if it's been done already today
                if (sameDate(currentValue.lastSession, now, 'day')) {
                    return;
                }

                const newValue: ActivityMeasurement = {
                    lastSession: now,
                    monthlySessions: currentValue.monthlySessions + 1,
                    totalSessions: currentValue.totalSessions + 1,
                };

                // Update memory
                this.values[type] = newValue;

                // Update long-term storage
                await this.memento.update(`vscode-docker.activity.${type}`, newValue);
            });
        }

        // Use of a lazy results in a max of one recording per session
        await this.lazySetterMap.get(type).getValue();

        // Additionally, do an overall activity recording
        if (type !== 'overall') {
            await this.recordActivity('overall');
        }
    }

    /**
     * Gets activity measurements. If none exists, a default value is provided.
     * If the current month is not the same as the last session, the monthly session count is reset.
     * @param type The activity type to get measurements for
     */
    public getActivity(type: ActivityType): ActivityMeasurement {
        if (!this.values.has(type)) {
            const currentValue = this.memento.get<ActivityMeasurement>(`vscode-docker.activity.${type}`, defaultMeasurement);
            const now = Date.now();

            // If the last session was not in this month, reset the monthly session count
            if (!sameDate(currentValue.lastSession, now, 'month')) {
                currentValue.monthlySessions = 0;
            }

            this.values[type] = currentValue;
        }

        return this.values.get(type);
    }
}

function sameDate(a: number | undefined, b: number | undefined, precision: 'day' | 'month'): boolean {
    // If either are undefined always return false
    if (a === undefined || b === undefined) {
        return false;
    }

    const a2 = new Date(a);
    const b2 = new Date(b);

    const sameMonth = a2.getFullYear() === b2.getFullYear() && a2.getMonth() === b2.getMonth();

    return precision === 'day' ? sameMonth && a2.getDate() === b2.getDate() : sameMonth;
}
