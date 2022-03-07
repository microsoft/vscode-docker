/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import type { Run as AcrRun, ImageDescriptor } from "@azure/arm-containerregistry"; // These are only dev-time imports so don't need to be lazy
import { AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { ThemeColor, ThemeIcon } from "vscode";
import { nonNullProp } from "../../../utils/nonNull";
import { AzureTaskTreeItem } from "./AzureTaskTreeItem";

dayjs.extend(relativeTime);

export class AzureTaskRunTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azureTaskRun';
    public contextValue: string = AzureTaskRunTreeItem.contextValue;
    public parent: AzureTaskTreeItem;

    private _run: AcrRun;

    public constructor(parent: AzureTaskTreeItem, run: AcrRun) {
        super(parent);
        this._run = run;
    }

    public get runName(): string {
        return nonNullProp(this._run, 'name');
    }

    public get runId(): string {
        return nonNullProp(this._run, 'runId');
    }

    public get label(): string {
        return this.runName;
    }

    public get id(): string {
        return this.runId;
    }

    public get createTime(): Date | undefined {
        return this._run.createTime;
    }

    public get outputImage(): ImageDescriptor | undefined {
        return this._run.outputImages && this._run.outputImages[0];
    }

    public get iconPath(): ThemeIcon {
        switch (this._run.status) {
            case 'Succeeded':
                return new ThemeIcon('check', new ThemeColor('debugIcon.startForeground'));
            case 'Failed':
                return new ThemeIcon('error', new ThemeColor('problemsErrorIcon.foreground'));
            case 'Running':
                return new ThemeIcon('debug-start', new ThemeColor('debugIcon.startForeground'));
            default:
                return new ThemeIcon('warning', new ThemeColor('problemsWarningIcon.foreground'));
        }
    }

    public get properties(): unknown {
        return this._run;
    }

    public get description(): string {
        const parts: string[] = [];
        if (this.createTime) {
            parts.push(dayjs(this.createTime).fromNow());
        }

        if (this._run.status && this._run.status !== 'Succeeded') {
            parts.push(this._run.status);
        }

        return parts.join(' - ');
    }
}
