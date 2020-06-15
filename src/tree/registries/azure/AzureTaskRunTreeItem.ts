/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerRegistryManagementModels as AcrModels } from "azure-arm-containerregistry";
import * as moment from 'moment';
import { AzExtTreeItem } from "vscode-azureextensionui";
import { nonNullProp } from "../../../utils/nonNull";
import { getThemedIconPath, IconPath } from "../../IconPath";
import { AzureTaskTreeItem } from "./AzureTaskTreeItem";

export class AzureTaskRunTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azureTaskRun';
    public contextValue: string = AzureTaskRunTreeItem.contextValue;
    public parent: AzureTaskTreeItem;

    private _run: AcrModels.Run;

    public constructor(parent: AzureTaskTreeItem, run: AcrModels.Run) {
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

    public get outputImage(): AcrModels.ImageDescriptor | undefined {
        return this._run.outputImages && this._run.outputImages[0];
    }

    public get iconPath(): IconPath {
        let icon: string;
        switch (this._run.status) {
            case 'Succeeded':
                icon = 'statusOk';
                break;
            case 'Failed':
                icon = 'statusError';
                break;
            case 'Running':
                icon = 'statusRun'
                break;
            default:
                icon = 'statusWarning';
        }
        return getThemedIconPath(icon);
    }

    public get properties(): unknown {
        return this._run;
    }

    public get description(): string {
        const parts: string[] = [];
        if (this.createTime) {
            parts.push(moment(this.createTime).fromNow());
        }

        if (this._run.status && this._run.status !== 'Succeeded') {
            parts.push(this._run.status);
        }

        return parts.join(' - ');
    }
}
