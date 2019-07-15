/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { DefaultAppStorageProvider } from './appStorage';
import ChildProcessProvider from './ChildProcessProvider';
import CliDockerClient from './CliDockerClient';
import CommandLineDotNetClient from './CommandLineDotNetClient';
import { DefaultDebuggerClient } from './debuggerClient';
import { DockerDebugSessionManager } from './debugSessionManager';
import DockerDebugConfigurationProvider from './dockerDebugConfigurationProvider';
import { DefaultDockerManager } from './dockerManager';
import { LocalFileSystemProvider } from './fsProvider';
import LocalOSProvider from './LocalOSProvider';
import { MsBuildNetCoreProjectProvider } from './netCoreProjectProvider';
import OpnBrowserClient from './OpnBrowserClient';
import { DefaultOutputManager } from './outputManager';
import { AggregatePrerequisite, DockerDaemonIsLinuxPrerequisite, DockerfileExistsPrerequisite, DotNetExtensionInstalledPrerequisite, DotNetSdkInstalledPrerequisite, LinuxUserInDockerGroupPrerequisite, MacNuGetFallbackFolderSharedPrerequisite } from './prereqManager';
import { OSTempFileProvider } from './tempFileProvider';
import { RemoteVsDbgClient } from './vsdbgClient';

export function registerDebugConfigurationProvider(ctx: vscode.ExtensionContext): void {
    const fileSystemProvider = new LocalFileSystemProvider();

    const processProvider = new ChildProcessProvider();
    const dockerClient = new CliDockerClient(processProvider);
    const osProvider = new LocalOSProvider();
    const dotNetClient = new CommandLineDotNetClient(processProvider, fileSystemProvider, osProvider);

    const dockerOutputManager = new DefaultOutputManager(ext.outputChannel);

    const dockerManager =
        new DefaultDockerManager(
            new DefaultAppStorageProvider(fileSystemProvider),
            new DefaultDebuggerClient(
                dockerClient,
                osProvider,
                new RemoteVsDbgClient(
                    dockerOutputManager,
                    fileSystemProvider,
                    ctx.globalState,
                    osProvider,
                    processProvider)),
            dockerClient,
            dotNetClient,
            dockerOutputManager,
            fileSystemProvider,
            osProvider,
            processProvider,
            ctx.workspaceState);

    const debugSessionManager = new DockerDebugSessionManager(
        vscode.debug.onDidTerminateDebugSession,
        dockerManager
    );

    ctx.subscriptions.push(debugSessionManager);

    ctx.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            'docker-coreclr',
            new DockerDebugConfigurationProvider(
                debugSessionManager,
                dockerManager,
                fileSystemProvider,
                osProvider,
                new MsBuildNetCoreProjectProvider(
                    fileSystemProvider,
                    dotNetClient,
                    new OSTempFileProvider(
                        osProvider,
                        processProvider)),
                new AggregatePrerequisite(
                    new DockerDaemonIsLinuxPrerequisite(
                        dockerClient,
                        vscode.window.showErrorMessage),
                    new DotNetExtensionInstalledPrerequisite(
                        new OpnBrowserClient(),
                        vscode.extensions.getExtension,
                        vscode.window.showErrorMessage),
                    new DotNetSdkInstalledPrerequisite(
                        dotNetClient,
                        vscode.window.showErrorMessage),
                    new MacNuGetFallbackFolderSharedPrerequisite(
                        fileSystemProvider,
                        osProvider,
                        vscode.window.showErrorMessage),
                    new LinuxUserInDockerGroupPrerequisite(
                        osProvider,
                        processProvider,
                        vscode.window.showErrorMessage),
                    new DockerfileExistsPrerequisite(
                        fileSystemProvider,
                        vscode.window.showErrorMessage,
                        vscode.commands.executeCommand)
                ))));
}
