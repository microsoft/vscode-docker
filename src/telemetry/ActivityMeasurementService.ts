/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AsyncLazy } from '../utils/lazy';

export type ActivityType = 'overall' | 'overallnoedit';

export interface IActivityMeasurementService {
    recordActivity(type: ActivityType): Promise<void>;
    getActivityMeasurement(type: ActivityType): ActivityMeasurement;
}

export interface ActivityMeasurement {
    lastSession: number | undefined;
    currentMonthSessions: number;
    totalSessions: number;
}

const defaultMeasurement: ActivityMeasurement = {
    lastSession: undefined,
    currentMonthSessions: 0,
    totalSessions: 0,
};

export class ActivityMeasurementService implements IActivityMeasurementService {
    private readonly lazySetterMap: Map<ActivityType, AsyncLazy<void>> = new Map<ActivityType, AsyncLazy<void>>();
    private readonly values: Map<ActivityType, ActivityMeasurement> = new Map<ActivityType, ActivityMeasurement>();

    public constructor(private readonly memento: vscode.Memento, private readonly requireTelemetryEnabled = true) {
    }

    /**
     * Records activity. Once per session (max 1 per day), it will increment the monthly and total session counts and set the date of the last session to now.
     * Calling with any type will also result in 'overall' activity being incremented, and any except edit will increment 'overallnoedit'.
     * @param type The activity type to record measurements for
     */
    public async recordActivity(type: ActivityType): Promise<void> {
        if (this.requireTelemetryEnabled && !vscode.env.isTelemetryEnabled) {
            return;
        }

        try {
            if (!this.lazySetterMap.has(type)) {
                this.lazySetterMap.set(type, new AsyncLazy(async () => {
                    const currentValue = this.getActivityMeasurement(type);
                    const now = Date.now();

                    // No need to increment if it's been done already today
                    if (sameDate(currentValue.lastSession, now, 'day')) {
                        return;
                    }

                    const newValue: ActivityMeasurement = {
                        lastSession: now,
                        currentMonthSessions: currentValue.currentMonthSessions + 1,
                        totalSessions: currentValue.totalSessions + 1,
                    };

                    // Update memory
                    this.values.set(type, newValue);

                    // Update long-term storage
                    await this.memento.update(`vscode-docker.activity.${type}`, newValue);
                }));
            }

            // Use of a lazy results in a max of one recording per session
            await this.lazySetterMap.get(type).getValue();

            // Additionally, do overall activity recording
            if (type !== 'overall') {
                await this.recordActivity('overall');
            }
        } catch {
            // Best effort
        }
    }

    /**
     * Gets activity measurements. If none exists, a default value is provided.
     * If the current month is not the same as the last session, the monthly session count is reset.
     * @param type The activity type to get measurements for
     */
    public getActivityMeasurement(type: ActivityType): ActivityMeasurement {
        if (this.requireTelemetryEnabled && !vscode.env.isTelemetryEnabled) {
            return defaultMeasurement;
        }

        if (!this.values.has(type)) {
            const currentValue = this.memento.get<ActivityMeasurement>(`vscode-docker.activity.${type}`, defaultMeasurement);
            const now = Date.now();

            // If the last session was not in this month, reset the monthly session count
            if (!sameDate(currentValue.lastSession, now, 'month')) {
                currentValue.currentMonthSessions = 0;
            }

            this.values.set(type, currentValue);
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
