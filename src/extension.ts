/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as path from 'path';
import { CoreOptions } from 'request';
import * as request from 'request-promise-native';
import { RequestPromise } from 'request-promise-native';
import * as vscode from 'vscode';
import { registerAppServiceExtensionVariables } from 'vscode-azureappservice';
import { AzureUserInput, callWithTelemetryAndErrorHandling, createTelemetryReporter, IActionContext, registerCommand, registerUIExtensionVariables } from 'vscode-azureextensionui';
import { ConfigurationParams, DidChangeConfigurationNotification, DocumentSelector, LanguageClient, LanguageClientOptions, Middleware, ServerOptions, TransportKind } from 'vscode-languageclient/lib/main';
import { composeDown, composeRestart, composeUp } from './commands/compose';
import { attachShellContainer } from './commands/containers/attachShellContainer';
import { pruneContainers } from './commands/containers/pruneContainers';
import { removeContainer } from './commands/containers/removeContainer';
import { restartContainer } from './commands/containers/restartContainer';
import { startContainer } from './commands/containers/startContainer';
import { stopContainer } from './commands/containers/stopContainer';
import { viewContainerLogs } from './commands/containers/viewContainerLogs';
import { buildImage } from './commands/images/buildImage';
import { inspectImage } from './commands/images/inspectImage';
import { pruneImages } from './commands/images/pruneImages';
import { pushImage } from './commands/images/pushImage';
import { removeImage } from './commands/images/removeImage';
import { runAzureCliImage } from './commands/images/runAzureCliImage';
import { runImage, runImageInteractive } from './commands/images/runImage';
import { tagImage } from './commands/images/tagImage';
import { createAzureRegistry } from './commands/registries/azure/createAzureRegistry';
import { deleteAzureRegistry } from './commands/registries/azure/deleteAzureRegistry';
import { deleteAzureRepository } from './commands/registries/azure/deleteAzureRepository';
import { deployImageToAzure } from './commands/registries/azure/deployImageToAzure';
import { openInAzurePortal } from './commands/registries/azure/openInAzurePortal';
import { buildImageInAzure } from "./commands/registries/azure/tasks/buildImageInAzure";
import { runAzureTask } from "./commands/registries/azure/tasks/runAzureTask";
import { runFileAsAzureTask } from './commands/registries/azure/tasks/runFileAsAzureTask';
import { viewAzureTaskLogs } from "./commands/registries/azure/tasks/viewAzureTaskLogs";
import { untagAzureImage } from './commands/registries/azure/untagAzureImage';
import { viewAzureProperties } from "./commands/registries/azure/viewAzureProperties";
import { copyRemoteImageDigest } from './commands/registries/copyRemoteImageDigest';
import { deleteRemoteImage } from './commands/registries/deleteRemoteImage';
import { openDockerHubInBrowser } from './commands/registries/dockerHub/openDockerHubInBrowser';
import { logInToDockerCli } from './commands/registries/logInToDockerCli';
import { logOutOfDockerCli } from './commands/registries/logOutOfDockerCli';
import { connectPrivateRegistry } from './commands/registries/private/connectPrivateRegistry';
import { disconnectPrivateRegistry } from './commands/registries/private/disconnectPrivateRegistry';
import { pullImage, pullRepository } from './commands/registries/pullImages';
import { consolidateDefaultRegistrySettings, setRegistryAsDefault } from './commands/registries/registrySettings';
import { systemPrune } from './commands/systemPrune';
import { configure, configureApi } from './configureWorkspace/configure';
import { DockerDebugConfigProvider } from './configureWorkspace/DockerDebugConfigProvider';
import { COMPOSE_FILE_GLOB_PATTERN, configPrefix, configurationKeys, ignoreBundle } from './constants';
import { registerDebugConfigurationProvider } from './debugging/coreclr/registerDebugConfigurationProvider';
import { DockerComposeCompletionItemProvider } from './dockerCompose/dockerComposeCompletionItemProvider';
import { DockerComposeHoverProvider } from './dockerCompose/dockerComposeHoverProvider';
import composeVersionKeys from './dockerCompose/dockerComposeKeyInfo';
import { DockerComposeParser } from './dockerCompose/dockerComposeParser';
import { DockerfileCompletionItemProvider } from './dockerfileCompletionItemProvider';
import { DefaultImageGrouping, ext, ImageGrouping } from './extensionVariables';
import { initTrees } from './tree/initTrees';
import { addUserAgent } from './utils/addUserAgent';
import { docker } from './utils/docker-endpoint';
import { getTrustedCertificates } from './utils/getTrustedCertificates';
import { Keytar } from './utils/keytar';
import { DefaultTerminalProvider } from './utils/TerminalProvider';
import { wrapError } from './utils/wrapError';

export type KeyInfo = { [keyName: string]: string };

export interface ComposeVersionKeys {
  All: KeyInfo;
  v1: KeyInfo;
  v2: KeyInfo;
}

let client: LanguageClient;

const DOCUMENT_SELECTOR: DocumentSelector = [
  { language: 'dockerfile', scheme: 'file' }
];

function initializeExtensionVariables(ctx: vscode.ExtensionContext): void {
  if (!ext.ui) {
    // This allows for standard interactions with the end user (as opposed to test input)
    ext.ui = new AzureUserInput(ctx.globalState);
  }
  ext.context = ctx;

  ext.outputChannel = vscode.window.createOutputChannel("Docker");
  ctx.subscriptions.push(ext.outputChannel);

  if (!ext.terminalProvider) {
    ext.terminalProvider = new DefaultTerminalProvider();
  }
  ext.reporter = createTelemetryReporter(ctx);
  if (!ext.keytar) {
    ext.keytar = Keytar.tryCreate();
  }

  registerUIExtensionVariables(ext);
  registerAppServiceExtensionVariables(ext);
}

export async function activateInternal(ctx: vscode.ExtensionContext, perfStats: { loadStartTime: number, loadEndTime: number | undefined }): Promise<void> {
  perfStats.loadEndTime = Date.now();

  initializeExtensionVariables(ctx);
  await setRequestDefaults();
  await callWithTelemetryAndErrorHandling('docker.activate', async (activateContext: IActionContext) => {
    activateContext.telemetry.properties.isActivationEvent = 'true';
    activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

    ctx.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        DOCUMENT_SELECTOR,
        new DockerfileCompletionItemProvider(),
        '.'
      )
    );

    const YAML_MODE_ID: vscode.DocumentFilter = {
      language: 'yaml',
      scheme: 'file',
      pattern: COMPOSE_FILE_GLOB_PATTERN
    };
    let yamlHoverProvider = new DockerComposeHoverProvider(
      new DockerComposeParser(),
      composeVersionKeys.All
    );
    ctx.subscriptions.push(
      vscode.languages.registerHoverProvider(YAML_MODE_ID, yamlHoverProvider)
    );
    ctx.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        YAML_MODE_ID,
        new DockerComposeCompletionItemProvider(),
        "."
      )
    );

    initTrees();
    registerDockerCommands();

    ctx.subscriptions.push(
      vscode.debug.registerDebugConfigurationProvider(
        'docker',
        new DockerDebugConfigProvider()
      )
    );
    registerDebugConfigurationProvider(ctx);
    readImageGrouping();

    await consolidateDefaultRegistrySettings();
    activateLanguageClient();
  });
}

async function setRequestDefaults(): Promise<void> {
  // Set up the user agent for all direct 'request' calls in the extension (as long as they use ext.request)
  // ...  Trusted root certificate authorities
  let caList = await getTrustedCertificates();
  let defaultRequestOptions: CoreOptions = { agentOptions: { ca: caList } };
  // ... User agent
  addUserAgent(defaultRequestOptions);
  let requestWithDefaults = request.defaults(defaultRequestOptions);

  // Wrap 'get' to provide better error message for self-signed certificates
  let originalGet = <(...args: unknown[]) => RequestPromise>requestWithDefaults.get;
  // tslint:disable-next-line:no-any
  async function wrappedGet(this: unknown, ...args: unknown[]): Promise<any> {
    try {
      // tslint:disable-next-line: no-unsafe-any
      return await originalGet.call(this, ...args);
    } catch (err) {
      let error = <{ cause?: { code?: string } }>err;

      if (error && error.cause && error.cause.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        err = wrapError(err, `There was a problem verifying a certificate. This could be caused by a self-signed or corporate certificate. You may need to set the 'docker.importCertificates' setting to true.`)
      }

      throw err;
    }
  }

  // tslint:disable-next-line:no-any
  requestWithDefaults.get = <any>wrappedGet;

  ext.request = requestWithDefaults;
}

function registerDockerCommands(): void {
  registerCommand('vscode-docker.api.configure', configureApi);
  registerCommand('vscode-docker.compose.down', composeDown);
  registerCommand('vscode-docker.compose.restart', composeRestart);
  registerCommand('vscode-docker.compose.up', composeUp);
  registerCommand('vscode-docker.configure', configure);
  registerCommand('vscode-docker.system.prune', systemPrune);

  registerCommand('vscode-docker.containers.attachShell', attachShellContainer);
  registerCommand('vscode-docker.containers.prune', pruneContainers);
  registerCommand('vscode-docker.containers.remove', removeContainer);
  registerCommand('vscode-docker.containers.restart', restartContainer);
  registerCommand('vscode-docker.containers.start', startContainer);
  registerCommand('vscode-docker.containers.stop', stopContainer);
  registerCommand('vscode-docker.containers.viewLogs', viewContainerLogs);

  registerCommand('vscode-docker.images.build', buildImage);
  registerCommand('vscode-docker.images.groupBy', groupImagesBy);
  registerCommand('vscode-docker.images.inspect', inspectImage);
  registerCommand('vscode-docker.images.prune', pruneImages);
  registerCommand('vscode-docker.images.push', pushImage);
  registerCommand('vscode-docker.images.remove', removeImage);
  registerCommand('vscode-docker.images.run', runImage);
  registerCommand('vscode-docker.images.runAzureCli', runAzureCliImage);
  registerCommand('vscode-docker.images.runInteractive', runImageInteractive);
  registerCommand('vscode-docker.images.tag', tagImage);

  registerCommand('vscode-docker.registries.copyImageDigest', copyRemoteImageDigest);
  registerCommand('vscode-docker.registries.deleteImage', deleteRemoteImage);
  registerCommand('vscode-docker.registries.deployImageToAzure', deployImageToAzure);
  registerCommand('vscode-docker.registries.logInToDockerCli', logInToDockerCli);
  registerCommand('vscode-docker.registries.logOutOfDockerCli', logOutOfDockerCli);
  registerCommand('vscode-docker.registries.pullImage', pullImage);
  registerCommand('vscode-docker.registries.pullRepository', pullRepository);
  registerCommand('vscode-docker.registries.setAsDefault', setRegistryAsDefault);

  registerCommand('vscode-docker.registries.dockerHub.logIn', (context: IActionContext) => ext.dockerHubAccountTreeItem.logIn(context));
  registerCommand('vscode-docker.registries.dockerHub.logOut', () => ext.dockerHubAccountTreeItem.logOut());
  registerCommand('vscode-docker.registries.dockerHub.openInBrowser', openDockerHubInBrowser);

  registerCommand('vscode-docker.registries.azure.buildImage', buildImageInAzure);
  registerCommand('vscode-docker.registries.azure.createRegistry', createAzureRegistry);
  registerCommand('vscode-docker.registries.azure.deleteRegistry', deleteAzureRegistry);
  registerCommand('vscode-docker.registries.azure.deleteRepository', deleteAzureRepository);
  registerCommand('vscode-docker.registries.azure.openInPortal', openInAzurePortal);
  registerCommand('vscode-docker.registries.azure.runTask', runAzureTask);
  registerCommand('vscode-docker.registries.azure.runFileAsTask', runFileAsAzureTask);
  registerCommand('vscode-docker.registries.azure.selectSubscriptions', () => vscode.commands.executeCommand("azure-account.selectSubscriptions"));
  registerCommand('vscode-docker.registries.azure.untagImage', untagAzureImage);
  registerCommand('vscode-docker.registries.azure.viewProperties', viewAzureProperties);
  registerCommand('vscode-docker.registries.azure.viewTaskLogs', viewAzureTaskLogs);

  registerCommand('vscode-docker.registries.private.connectRegistry', connectPrivateRegistry);
  registerCommand('vscode-docker.registries.private.disconnectRegistry', disconnectPrivateRegistry);
}

export async function deactivateInternal(): Promise<void> {
  if (!client) {
    return undefined;
  }
  // perform cleanup
  Configuration.dispose();
  return await client.stop();
}

namespace Configuration {
  let configurationListener: vscode.Disposable;

  export function computeConfiguration(params: ConfigurationParams): vscode.WorkspaceConfiguration[] {
    let result: vscode.WorkspaceConfiguration[] = [];
    for (let item of params.items) {
      let config: vscode.WorkspaceConfiguration;

      if (item.scopeUri) {
        config = vscode.workspace.getConfiguration(
          item.section,
          client.protocol2CodeConverter.asUri(item.scopeUri)
        );
      } else {
        config = vscode.workspace.getConfiguration(item.section);
      }
      result.push(config);
    }
    return result;
  }

  export function initialize(): void {
    configurationListener = vscode.workspace.onDidChangeConfiguration(
      async (e: vscode.ConfigurationChangeEvent) => {
        // notify the language server that settings have change
        client.sendNotification(DidChangeConfigurationNotification.type, {
          settings: null
        });

        // Update endpoint and refresh explorer if needed
        if (e.affectsConfiguration('docker')) {
          docker.refreshEndpoint();
          // tslint:disable-next-line: no-floating-promises
          setRequestDefaults();
          readImageGrouping();
          await ext.imagesTree.refresh();
        }
      }
    );
  }

  export function dispose(): void {
    if (configurationListener) {
      // remove this listener when disposed
      configurationListener.dispose();
    }
  }
}

function activateLanguageClient(): void {
  // Don't wait
  callWithTelemetryAndErrorHandling('docker.languageclient.activate', async (context: IActionContext) => {
    context.telemetry.properties.isActivationEvent = 'true';
    let serverModule = ext.context.asAbsolutePath(
      path.join(
        ignoreBundle ? "node_modules" : "dist",
        "dockerfile-language-server-nodejs",
        "lib",
        "server.js"
      )
    );
    assert(true === await fse.pathExists(serverModule), "Could not find language client module");

    let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    let serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
        args: ["--node-ipc"]
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: debugOptions
      }
    };

    let middleware: Middleware = {
      workspace: {
        configuration: Configuration.computeConfiguration
      }
    };

    let clientOptions: LanguageClientOptions = {
      documentSelector: DOCUMENT_SELECTOR,
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc")
      },
      middleware: middleware
    };

    client = new LanguageClient(
      "dockerfile-langserver",
      "Dockerfile Language Server",
      serverOptions,
      clientOptions
    );
    // tslint:disable-next-line:no-floating-promises
    client.onReady().then(() => {
      // attach the VS Code settings listener
      Configuration.initialize();
    });
    client.start();
  });
}

function readImageGrouping(): void {
  const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(configPrefix);
  let imageGrouping: string | undefined = configOptions.get<string>(configurationKeys.groupImagesBy);
  ext.groupImagesBy = imageGrouping && imageGrouping in ImageGrouping ? <ImageGrouping>ImageGrouping[imageGrouping] : DefaultImageGrouping;
}

async function groupImagesBy(): Promise<void> {
  let response = await ext.ui.showQuickPick(
    [
      { label: "No grouping", data: ImageGrouping.None },
      { label: "Group by repository", data: ImageGrouping.Repository },
      { label: "Group by repository name", data: ImageGrouping.RepositoryName },
      { label: "Group by image ID", data: ImageGrouping.ImageId },
    ],
    {
      placeHolder: "Select how to group the Images node entries"
    });

  ext.groupImagesBy = response.data;
  const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(configPrefix);
  configOptions.update(configurationKeys.groupImagesBy, ImageGrouping[ext.groupImagesBy], vscode.ConfigurationTarget.Global);
  await ext.imagesTree.refresh();
}
