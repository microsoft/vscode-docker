/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IConnectRegistryWizardOptions {
    /**
     * The title for the wizard (e.g. "Sign In To Docker Hub")
     */
    wizardTitle: string;

    /**
     * Set to true to prompt for a url
     */
    includeUrl?: boolean;

    /**
     * Optional value to overwrite the default text displayed underneath the url input box
     */
    urlPrompt?: string;

    /**
     * Set to true to prompt for a username
     */
    includeUsername?: boolean;

    /**
     * Optional value to overwrite the default prompt text displayed underneath the username input box
     */
    usernamePrompt?: string;

    /**
     * Optional value to overwrite the default "ghost" text displayed within the username input box
     */
    usernamePlaceholder?: string;

    /**
     * Set to true if the username is optional
     */
    isUsernameOptional?: boolean;

    /**
     * Set to true to prompt for a password
     */
    includePassword?: boolean;

    /**
     * Optional value to overwrite the default text displayed underneath the password input box
     */
    passwordPrompt?: string;
}
