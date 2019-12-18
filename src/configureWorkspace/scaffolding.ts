import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem, } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { Platform, PlatformOS } from "../utils/platform";
import { quickPickWorkspaceFolder } from '../utils/quickPickWorkspaceFolder';
import { promptForPorts as promptForPortsUtil, quickPickOS } from './configUtils';

export interface ScaffoldContext extends IActionContext {
    folder?: vscode.WorkspaceFolder;
    os?: PlatformOS;
    outputFolder?: string;
    platform?: Platform;
    ports?: number[];
    rootFolder?: string;
}

export interface ScaffolderContext extends ScaffoldContext {
    folder: vscode.WorkspaceFolder;
    outputFolder: string;
    platform: Platform;
    promptForOS(): Promise<PlatformOS>;
    promptForPorts(defaultPorts?: number[]): Promise<number[]>;
    rootFolder: string;
    scaffoldDockerIgnoreFile(context: ScaffolderContext): Promise<ScaffoldFile>;
}

export type ScaffoldedFile = {
    filePath: string;
    open?: boolean;
};

export type ScaffoldFile = {
    contents: string;
    fileName: string;
    open?: boolean;
};

export type Scaffolder = (context: ScaffolderContext) => Promise<ScaffoldFile[]>;

async function promptForFolder(): Promise<vscode.WorkspaceFolder> {
    return await quickPickWorkspaceFolder('To generate Docker files you must first open a folder or workspace in VS Code.');
}

async function promptForOS(): Promise<PlatformOS> {
    return await quickPickOS();
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
    return await promptForPortsUtil(defaultPorts);
}

// tslint:disable-next-line: promise-function-async
function scaffoldDockerIgnoreFile(context: ScaffolderContext): Promise<ScaffoldFile> {
    const ignoredItems = [
        '**/.classpath',
        '**/.dockerignore',
        '**/.env',
        '**/.git',
        '**/.gitignore',
        '**/.project',
        '**/.settings',
        '**/.toolstarget',
        '**/.vs',
        '**/.vscode',
        '**/*.*proj.user',
        '**/*.dbmdl',
        '**/*.jfm',
        '**/azds.yaml',
        context.platform !== 'Node.js' ? '**/bin' : undefined,
        '**/charts',
        '**/docker-compose*',
        '**/Dockerfile*',
        '**/node_modules',
        '**/npm-debug.log',
        '**/obj',
        '**/secrets.dev.yaml',
        '**/values.dev.yaml',
        'README.md'
    ];

    const contents = ignoredItems.filter(item => item !== undefined).join('\n');

    return Promise.resolve(
        {
            contents,
            fileName: '.dockerignore'
        });
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
    const folder = context.folder ?? await promptForFolder();
    const rootFolder = context.rootFolder ?? folder.uri.fsPath;
    const outputFolder = context.outputFolder ?? rootFolder;
    const platform = context.platform ?? await promptForPlatform();
    const scaffolder = scaffolders.get(platform);

    if (!scaffolder) {
        throw new Error(`No scaffolder is registered for platform '${context.platform}'.`);
    }

    const files = await scaffolder({
        ...context,
        folder,
        outputFolder,
        platform,
        promptForOS,
        promptForPorts,
        rootFolder,
        scaffoldDockerIgnoreFile
    });

    const writtenFiles: ScaffoldedFile[] = [];

    await Promise.all(
        files.map(
            async file => {
                const filePath = path.join(rootFolder, file.fileName);

                if (await fse.pathExists(filePath) === false || await promptForOverwrite(file.fileName)) {
                    await fse.writeFile(filePath, file.contents, 'utf8');

                    writtenFiles.push({ filePath, open: file.open });
                }
            }));

    return writtenFiles;
}
