/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//AsyncPool Constants
export const MAX_CONCURRENT_REQUESTS = 8;
export const MAX_CONCURRENT_SUBSCRIPTON_REQUESTS = 5;

// Consider downloading multiple pages (images, tags, etc)
export const PAGE_SIZE = 100;

export namespace keytarConstants {
    export const serviceId: string = 'vscode-docker';

    export const dockerHubTokenKey: string = 'dockerhub.token';
    export const dockerHubUserNameKey: string = 'dockerhub.username';
    export const dockerHubPasswordKey: string = 'dockerhub.password';
}

export namespace configurationKeys {
    export const defaultRegistryPath = "defaultRegistryPath";
}

//Credentials Constants
export const NULL_GUID = '00000000-0000-0000-0000-000000000000';

//Azure Container Registries
export const skus = ["Standard", "Basic", "Premium"];
