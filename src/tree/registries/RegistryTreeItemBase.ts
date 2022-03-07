/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { ThemeIcon } from "vscode";
import { RequestLike } from "../../utils/httpRequest";
import { IRegistryAuthTreeItem } from "../../utils/registryRequestUtils";
import { getRegistryContextValue, registrySuffix } from "./registryContextValues";

/**
 * Base class for all registries
 * NOTE: A registry is loosely defined as anything that contains repositories (e.g. a private registry or a Docker Hub namespace)
 */
export abstract class RegistryTreeItemBase extends AzExtParentTreeItem implements IRegistryAuthTreeItem {
    public childTypeLabel: string = 'repository';

    public constructor(parent: AzExtParentTreeItem | undefined) {
        super(parent);
        this.iconPath = new ThemeIcon('briefcase');
    }

    public get contextValue(): string {
        return getRegistryContextValue(this, registrySuffix);
    }

    /**
     * Used for an image's full tag
     * For example, if the full tag is "example.azurecr.io/hello-world:latest", this would return "example.azurecr.io"
     * NOTE: This usually would _not_ include the protocol part of a url
     */
    public abstract baseImagePath: string;

    /**
     * Used for registry requests
     * NOTE: This _should_ include the protocol part of a url
     */
    public abstract baseUrl: string;

    /**
     * This will be called before each registry request to add authentication
     */
    public abstract signRequest(request: RequestLike): Promise<RequestLike>;

    /**
     * Describes credentials used to log in to the docker cli before pushing or pulling an image
     */
    public abstract getDockerCliCredentials(): Promise<IDockerCliCredentials>;
}

export interface IDockerCliCredentials {
    /**
     * Return either username/password or token credentials
     * Return undefined if this registry doesn't require logging in to the docker cli
     * NOTE: This may or may not be the same credentials used for registry requests
     */
    auth?: { token: string } | { username: string; password: string };

    /**
     * The registry to log in to
     * For central registries, this will usually be at an account level (aka empty for all of Docker Hub)
     * For private registries, this will usually be at the registry level (aka the registry url)
     */
    registryPath: string;
}
