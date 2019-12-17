import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem, } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { Platform, PlatformOS } from "../utils/platform";
import { quickPickWorkspaceFolder } from '../utils/quickPickWorkspaceFolder';

export interface ScaffoldContext extends IActionContext {
    folder?: vscode.WorkspaceFolder;
    os?: PlatformOS;
    outputFolder?: string;
    platform?: Platform;
    ports?: number[];
    rootFolder?: string;
}

export interface ScaffolderContext extends ScaffoldContext {
    promptForOS(): Promise<PlatformOS>;
    promptForPorts(defaultPorts?: number[]): Promise<number[]>;
}

export type ScaffoldedFile = {
    fileName: string;
    open?: boolean;
};

export type ScaffoldFile = ScaffoldedFile & {
    contents: string;
};

export type Scaffolder = (context: ScaffolderContext) => Promise<ScaffoldFile[]>;

async function promptForFolder(): Promise<vscode.WorkspaceFolder> {
    return await quickPickWorkspaceFolder('To generate Docker files you must first open a folder or workspace in VS Code.');
}

async function promptForOS(): Promise<PlatformOS> {
    return Promise.resolve(undefined);
}

async function promptForOverwrite(fileName: string): Promise<boolean> {
    const YES_PROMPT: vscode.MessageItem = {
        title: 'Yes',
        isCloseAffordance: false
    };
    const YES_OR_NO_PROMPTS: vscode.MessageItem[] = [
        YES_PROMPT,
        {
            title: 'No',
            isCloseAffordance: true
        }
    ];

    const response = await vscode.window.showErrorMessage(`"${fileName}" already exists. Would you like to overwrite it?`, ...YES_OR_NO_PROMPTS);

    return response === YES_PROMPT;
}

async function promptForPorts(defaultPorts?: number[]): Promise<number[]> {
    return defaultPorts;
}

const scaffolders: Map<Platform, Scaffolder> = new Map<Platform, Scaffolder>();

async function promptForPlatform(): Promise<Platform> {
    let opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Application Platform'
    }

    const items = Array.from(scaffolders.keys()).map(p => <IAzureQuickPickItem<Platform>>{ label: p, data: p });
    let response = await ext.ui.showQuickPick(items, opt);
    return response.data;
}

export function registerScaffolder(platform: Platform, scaffolder: Scaffolder): void {
    scaffolders.set(platform, scaffolder);
}

export async function scaffold(context: ScaffoldContext): Promise<ScaffoldedFile[]> {
    if (!context.folder) {
        context.folder = await promptForFolder();
    }

    if (!context.rootFolder) {
        context.rootFolder = context.folder.uri.fsPath;
    }

    if (!context.outputFolder) {
        context.outputFolder = context.rootFolder;
    }

    if (!context.platform) {
        context.platform = await promptForPlatform();
    }

    const scaffolder = scaffolders.get(context.platform);

    if (!scaffolder) {
        throw new Error(`No scaffolder is registered for platform '${context.platform}'.`);
    }

    const files = await scaffolder({
        ...context,
        promptForOS,
        promptForPorts
    });

    const writtenFiles: ScaffoldFile[] = [];

    await Promise.all(
        files.map(
            async file => {
                const filePath = path.join(context.folder.uri.fsPath, file.fileName);

                if (await fse.pathExists(filePath) === false || await promptForOverwrite(file.fileName)) {
                    await fse.writeFile(filePath, file.contents, 'utf8');

                    writtenFiles.push(file);
                }
            }));

    return writtenFiles.map(file => ({ fileName: file.fileName, open: file.open }));
}
