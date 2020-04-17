/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { nonNullProp } from "../../../utils/nonNull";
import { getIconPath, IconPath } from "../../IconPath";
import { DockerV2RegistryTreeItemBase } from "../dockerV2/DockerV2RegistryTreeItemBase";
import { getRegistryContextValue, registryProviderSuffix, registrySuffix } from "../registryContextValues";
import { CloudsmithRepositoryTreeItem } from "./CloudsmithRepositoryTreeItem";

export class CloudsmithRegistryTreeItem extends DockerV2RegistryTreeItemBase {
    public label: string = 'Cloudsmith';

    public get contextValue(): string {
        return getRegistryContextValue(this, registrySuffix, registryProviderSuffix);
    }

    public get id(): string {
        return this.baseUrl;
    }

    public get baseUrl(): string {
        return nonNullProp(this.cachedProvider, 'url');
    }

    public get baseImagePath(): string {
        /* produces a compatible base image path by
        removing the protocol, /v2 schema, and trailing slash
        */
        return nonNullProp(this.cachedProvider, 'url').replace(/(\/v2)|(\/$)|((\w+:|^)\/\/)/g, '');
    }

    public get iconPath(): IconPath {
        return getIconPath('cloudsmith');
    }

    public createRepositoryTreeItem(name: string): CloudsmithRepositoryTreeItem {
        return new CloudsmithRepositoryTreeItem(this, name, this.cachedProvider, this.authHelper, this.authContext);
    }
}
