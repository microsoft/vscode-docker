/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthOptions } from "request";
import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, GenericTreeItem, IActionContext, ICreateChildImplContext } from "vscode-azureextensionui";
import { keytarConstants } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { nonNullProp } from "../../../utils/nonNull";
import { getThemedIconPath, IconPath } from "../../IconPath";
import { isAncestoryOfRegistryType, RegistryType } from "../RegistryType";
import { IPrivateRegistryWizardContext } from "./connectWizard/IPrivateRegistryWizardContext";
import { PrivateRegistryPasswordStep } from "./connectWizard/PrivateRegistryPasswordStep";
import { PrivateRegistryUrlStep } from "./connectWizard/PrivateRegistryUrlStep";
import { PrivateRegistryUsernameStep } from "./connectWizard/PrivateRegistryUsernameStep";
import { PrivateRegistryTreeItem } from "./PrivateRegistryTreeItem";

const customRegistriesKey = 'customRegistries';

export class PrivateRegistriesTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = RegistryType.private + 'Registries';
    public contextValue: string = PrivateRegistriesTreeItem.contextValue;
    public createNewLabel: string = 'Connect registry... (Preview)';
    public childTypeLabel: string = 'registry';
    public label: string = 'Private';

    private _registries: PrivateRegistryNonsensitive[] = [];

    public get iconPath(): IconPath {
        return getThemedIconPath('ConnectPlugged');
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        this._registries = ext.context.globalState.get<PrivateRegistryNonsensitive[]>(customRegistriesKey) || [];
        if (this._registries.length === 0) {
            const ti = new GenericTreeItem(this, {
                label: this.createNewLabel,
                contextValue: 'privateConnect',
                commandId: 'vscode-docker.registries.private.connectRegistry'
            });
            ti.commandArgs = [this];
            return [ti];
        } else {
            return this.createTreeItemsWithErrorHandling(
                this._registries,
                'invalidPrivateRegistry',
                async r => new PrivateRegistryTreeItem(this, r),
                r => r.url
            )
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public isAncestorOfImpl(expectedContextValue: string): boolean {
        return isAncestoryOfRegistryType(expectedContextValue, RegistryType.private);
    }

    public async createChildImpl(context: IPrivateRegistryWizardContext & ICreateChildImplContext): Promise<AzExtTreeItem> {
        context.existingUrls = this._registries.map(u => u.url);
        const title: string = "Connect private registry";
        const wizard = new AzureWizard(context, {
            title,
            hideStepCount: true, // hiding count because it's confusing with the optional username/password steps
            promptSteps: [
                new PrivateRegistryUrlStep(),
                new PrivateRegistryUsernameStep(),
                new PrivateRegistryPasswordStep()
            ]
        });
        await wizard.prompt();
        await wizard.execute();

        const newRegistryUrl = nonNullProp(context, 'newRegistryUrl');
        let noAuth = !context.newRegistryUsername && !context.newRegistryPassword;
        if (!noAuth) {
            const credentials: AuthOptions = {
                username: context.newRegistryUsername,
                password: context.newRegistryPassword
            };
            let sensitive: string = JSON.stringify(credentials);
            let key = getUsernamePwdKey(newRegistryUrl);
            if (ext.keytar) {
                await ext.keytar.setPassword(keytarConstants.serviceId, key, sensitive);
            }
        }

        const reg = { url: newRegistryUrl, noAuth };
        this._registries.push(reg);
        await ext.context.globalState.update(customRegistriesKey, this._registries);
        return new PrivateRegistryTreeItem(this, reg);
    }

    public async disconnectRegistry(reg: PrivateRegistryNonsensitive): Promise<void> {
        let key = getUsernamePwdKey(reg.url);
        if (!reg.noAuth && ext.keytar) {
            await ext.keytar.deletePassword(keytarConstants.serviceId, key);
        }

        const index = this._registries.findIndex(u => u.url === reg.url);
        this._registries.splice(index, 1);
        await ext.context.globalState.update(customRegistriesKey, this._registries);
    }

    public async getAuth(reg: PrivateRegistryNonsensitive): Promise<AuthOptions | undefined> {
        let key = getUsernamePwdKey(reg.url);
        if (!reg.noAuth && ext.keytar) {
            let authString = await ext.keytar.getPassword(keytarConstants.serviceId, key);
            if (authString) {
                return <AuthOptions>JSON.parse(authString);
            }
        }

        return undefined;
    }
}

export interface PrivateRegistryNonsensitive {
    url: string,
    noAuth?: boolean
}

function getUsernamePwdKey(registryUrl: string): string {
    return `usernamepwd_${registryUrl}`;
}
