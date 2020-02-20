/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import vscode = require('vscode');
import { IAzureQuickPickItem, TelemetryProperties } from 'vscode-azureextensionui';
import { DockerOrchestration } from '../constants';
import { ext } from "../extensionVariables";
import { localize } from '../localize';
import { captureCancelStep } from '../utils/captureCancelStep';
import { Platform, PlatformOS } from '../utils/platform';

export type ConfigureTelemetryProperties = {
    configurePlatform?: Platform;
    configureOs?: PlatformOS;
    orchestration?: DockerOrchestration;
    packageFileType?: string; // 'build.gradle', 'pom.xml', 'package.json', '.csproj', '.fsproj'
    packageFileSubfolderDepth?: string; // 0 = project/etc file in root folder, 1 = in subfolder, 2 = in subfolder of subfolder, etc.
};

export type ConfigureTelemetryCancelStep = 'folder' | 'platform' | 'os' | 'compose' | 'port' | 'project' | 'pythonFile';

export async function captureConfigureCancelStep<TReturn, TPrompt extends (...args: []) => Promise<TReturn>>(cancelStep: ConfigureTelemetryCancelStep, properties: TelemetryProperties, prompt: TPrompt): Promise<TReturn> {
    return await captureCancelStep(cancelStep, properties, prompt)();
}

/**
 * Prompts for port numbers
 * @throws `UserCancelledError` if the user cancels.
 */
export async function promptForPorts(ports: number[]): Promise<number[]> {
    let opt: vscode.InputBoxOptions = {
        placeHolder: ports.join(', '),
        prompt: localize('vscode-docker.configUtils.whatPort', 'What port(s) does your app listen on? Enter a comma-separated list, or empty for no exposed port.'),
        value: ports.join(', '),
        validateInput: (value: string): string | undefined => {
            let result = splitPorts(value);
            if (!result) {
                return localize('vscode-docker.configUtils.portsFormat', 'Ports must be a comma-separated list of positive integers (1 to 65535), or empty for no exposed port.');
            }

            return undefined;
        }
    }

    return splitPorts(await ext.ui.showInputBox(opt));
}

/**
 * Splits a comma separated string of port numbers
 */
export function splitPorts(value: string): number[] | undefined {
    if (!value || value === '') {
        return [];
    }

    let elements = value.split(',').map(p => p.trim());
    let matches = elements.filter(p => p.match(/^-*\d+$/));

    if (matches.length < elements.length) {
        return undefined;
    }

    let ports = matches.map(Number);

    // If anything is non-integral or less than 1 or greater than 65535, it's not valid
    if (ports.some(p => !Number.isInteger(p) || p < 1 || p > 65535)) {
        return undefined;
    }

    return ports;
}

/**
 * Prompts for a platform
 * @throws `UserCancelledError` if the user cancels.
 */
export async function quickPickPlatform(platforms?: Platform[]): Promise<Platform> {
    let opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: localize('vscode-docker.configUtils.selectPlatform', 'Select Application Platform')
    }

    platforms = platforms || [
        'Node.js',
        '.NET: ASP.NET Core',
        '.NET: Core Console',
        'Python: Django',
        'Python: Flask',
        'Python: General',
        'Java',
        'C++',
        'Go',
        'Ruby',
        'Other'
    ];

    const items = platforms.map(p => <IAzureQuickPickItem<Platform>>{ label: p, data: p });
    let response = await ext.ui.showQuickPick(items, opt);
    return response.data;
}

/**
 * Prompts for an OS
 * @throws `UserCancelledError` if the user cancels.
 */
export async function quickPickOS(): Promise<PlatformOS> {
    let opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: localize('vscode-docker.configUtils.selectOS', 'Select Operating System')
    }

    const OSes: PlatformOS[] = ['Windows', 'Linux'];
    const items = OSes.map(p => <IAzureQuickPickItem<PlatformOS>>{ label: p, data: p });

    let response = await ext.ui.showQuickPick(items, opt);
    return response.data;
}

export async function quickPickGenerateComposeFiles(): Promise<boolean> {
    let opt: vscode.QuickPickOptions = {
        placeHolder: localize('vscode-docker.configUtils.includeCompose', 'Include optional Docker Compose files?')
    }

    let response = await ext.ui.showQuickPick(
        [
            { label: 'No', data: false },
            { label: 'Yes', data: true }
        ],
        opt);

    return response.data;
}

export function getSubfolderDepth(outputFolder: string, filePath: string): string {
    let relativeToRoot = path.relative(outputFolder, path.resolve(outputFolder, filePath));
    let matches = relativeToRoot.match(/[\/\\]/g);
    let depth: number = matches ? matches.length : 0;
    return String(depth);
}

export function genCommonDockerIgnoreFile(platformType: Platform): string {
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
        platformType !== 'Node.js' ? '**/bin' : undefined,
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

    return ignoredItems.filter(item => item !== undefined).join('\n');
}
