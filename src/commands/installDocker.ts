/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import ChildProcessProvider from '../debugging/coreclr/ChildProcessProvider';
import { LocalFileSystemProvider } from '../debugging/coreclr/fsProvider';
import { OSTempFileProvider } from '../debugging/coreclr/tempFileProvider';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { streamToFile } from '../utils/httpRequest';
import LocalOSProvider from '../utils/LocalOSProvider';
import { DefaultOutputManager, OutputManager } from '../utils/outputManager';

export async function installDocker(context: IActionContext): Promise<void> {
    const confirmInstall: string = localize('vscode-docker.commands.installDocker.confirm', 'Are you sure you want to install docker on this machine.');
    // no need to check result - cancel will throw a UserCancelledError
    await ext.ui.showWarningMessage(confirmInstall, { modal: true }, { title: 'Install' });

    // TODO: Block second installation while in progress.
    const outputManager = new DefaultOutputManager(ext.outputChannel);

    await outputManager.performOperation(
        'Install Docker',
        async (output) => {
            const fileName = await downloadInstaller(output);
            await Install(output, fileName);
        },
        'Installation is complete. Please start the docker for desktop.',
        'something went wrong'
    );

    // await vscode.commands.executeCommand('.action.reloadWindow');
}

async function downloadInstaller(output: OutputManager): Promise<string> {
    const osProvider = new LocalOSProvider();
    const processProvider = new ChildProcessProvider();
    const tempFileProvider = new OSTempFileProvider(osProvider, processProvider);
    let url = '';
    let fileExt = '';

    if (osProvider.isMac) {
        url = 'https://aka.ms/download-docker-mac-vscode';
        fileExt = 'dmg';
    } else if (osProvider.os === 'Windows') {
        url = 'https://aka.ms/download-docker-windows-vscode';
        fileExt = 'exe';
    } else {
        url = 'https://aka.ms/download-docker-linux-vscode';
        fileExt = '.sh';
    }
    let fileName = tempFileProvider.getTempFilename('docker', fileExt);

    if (osProvider.os === 'Windows') {
        fileName = 'c:\\temp\\docker_win.exe';
        output.appendLine(`Reusing an existing installer ${fileName}`);
    } else {
        output.appendLine(`Downloading the installer to ${fileName}`);
        await streamToFile(url, fileName);
        output.appendLine("Download completed.");
        return fileName;
    }


}

async function Install(output: OutputManager, fileName: string): Promise<void> {
    const fsProvider = new LocalFileSystemProvider();
    try {
        const processProvider = new ChildProcessProvider();
        const execOptions = {
            progress: (content) => {
                // eslint-disable-next-line @typescript-eslint/tslint/config
                output.appendLine(content);
            }
        };
        await processProvider.exec(fileName, execOptions);
    } finally {
        if (await fsProvider.fileExists(fileName + 's')) {
            await fsProvider.unlinkFile(fileName + 's');
        }
    }
}
