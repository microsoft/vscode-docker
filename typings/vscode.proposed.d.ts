/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This is the place for API experiments and proposals.
 * These API are NOT stable and subject to change. They are only available in the Insiders
 * distribution and CANNOT be used in published extensions.
 *
 * To test these API in local environment:
 * - Use Insiders release of VS Code.
 * - Add `"enableProposedApi": true` to your package.json.
 * - Copy this file to your project.
 */

declare module 'vscode' {

	//#region Joh - ExecutionContext

	export enum ExtensionExecutionContext {
		Local = 1,
		Remote = 2
	}

	export interface ExtensionContext {
		/**
		 * Describes the context in which this extension is executed, e.g.
		 * a Node.js-context on the same machine or on a remote machine
		 */
		executionContext: ExtensionExecutionContext;
	}

	//#endregion

}
