import * as opn from 'opn';
import * as vscode from "vscode";
import { IActionContext, registerCommand } from "vscode-azureextensionui";
import { UserCancelledError } from '../../explorer/deploy/wizard';
import { AzureUtilityManager } from "../azureUtilityManager";

let alphaNum = new RegExp('^[a-zA-Z0-9]*$');

export function isValidAzureName(value: string): { isValid: boolean, message?: string } {
    if (value.length < 5 || value.length > 50) {
        return { isValid: false, message: 'Name must be between 5 and 50 characters' };
    } else if (!alphaNum.test(value)) {
        return { isValid: false, message: 'Name may contain alpha numeric characters only' };
    } else {
        return { isValid: true };
    }
}

/** Uses consistent error handling from register command to replace callbacks for commands that have a dependency on azure account.
 * If the dependency is not found notifies users providing them with information to go download the extension.
 */
// tslint:disable-next-line:no-any
export function registerAzureCommand(commandId: string, callback: (...args: any[]) => any): void {
    // tslint:disable-next-line:no-function-expression
    registerCommand(commandId, async function (this: IActionContext): Promise<void> {
        if (!await AzureUtilityManager.getInstance().tryGetAzureAccount()) {
            const open: vscode.MessageItem = { title: "View in Marketplace" };
            const msg = 'Please install the Azure Account extension to use Azure features.';
            let response = await vscode.window.showErrorMessage(msg, open);
            let viewInMarketplace = response === open;
            this.properties.viewInMarketplace = viewInMarketplace ? 'true' : 'false';
            if (viewInMarketplace) {
                // tslint:disable-next-line:no-unsafe-any
                opn('https://marketplace.visualstudio.com/items?itemName=ms-vscode.azure-account');
            }

            this.rethrowError = false;
            this.suppressErrorDisplay = true;
            throw new Error(msg);
        } else {
            // tslint:disable-next-line:no-unsafe-any
            await callback();
        }
    });
}
