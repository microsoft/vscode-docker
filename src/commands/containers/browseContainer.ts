/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, TelemetryProperties } from "vscode-azureextensionui";
import { DockerPort } from '../../docker/Containers';
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { ContainerTreeItem } from "../../tree/containers/ContainerTreeItem";
import { captureCancelStep } from '../../utils/captureCancelStep';

type BrowseTelemetryProperties = TelemetryProperties & { possiblePorts?: string, selectedPort?: number };

type ConfigureBrowseCancelStep = 'node' | 'port';

async function captureBrowseCancelStep<T>(cancelStep: ConfigureBrowseCancelStep, properties: BrowseTelemetryProperties, prompt: () => Promise<T>): Promise<T> {
    return await captureCancelStep(cancelStep, properties, prompt)();
}

// NOTE: These ports are ordered in order of preference.
const commonWebPorts = [
    443,    // SSL
    80,     // HTTP
    3000,   // (Node.js) Express.js
    3001,   // (Node.js) Sails.js
    5001,   // (.NET Core) ASP.NET SSL
    5000,   // (.NET Core) ASP.NET HTTP and (Python) Flask
    8000,   // (Python) Django
    8080,   // (Node.js)
    8081    // (Node.js)
];

const commonSslPorts = [
    443,    // SSL
    5001    // (.NET Core) ASP.NET SSL
];

export async function browseContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    const telemetryProperties = <BrowseTelemetryProperties>context.telemetry.properties;

    if (!node) {
        await ext.containersTree.refresh();
        node = await captureBrowseCancelStep('node', telemetryProperties, async () =>
            ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, {
                ...context,
                noItemFoundErrorMessage: localize('vscode-docker.commands.containers.browseContainer.noContainers', 'No running containers are available to open in a browser')
            }));
    }

    const ports = node.ports ?? [];
    const possiblePorts = ports.filter(port => port.PublicPort && port.PrivatePort) // Ports must be defined (not falsy)
        .filter(port => port.Type ?? 'tcp' === 'tcp') // Type must be undefined or tcp
        .filter(port => port.IP); // IP must be defined (not falsy)

    telemetryProperties.possiblePorts = possiblePorts.map(port => port.PrivatePort).toString();

    if (possiblePorts.length === 0) {
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        ext.ui.showWarningMessage(localize('vscode-docker.commands.containers.browseContainer.noPorts', 'No valid ports are available.'));
        return;
    }

    let selectedPort: DockerPort;
    if (possiblePorts.length === 1) {
        // If there's just a single port, assume that one...
        selectedPort = possiblePorts[0];
    } else {
        // Otherwise, prefer a common port (in order of preference)...
        const preferredCommonPrivatePort: number | undefined = commonWebPorts.find(commonPort => possiblePorts.some(possiblePort => commonPort === possiblePort.PrivatePort));
        selectedPort = possiblePorts.find(possiblePort => possiblePort.PrivatePort === preferredCommonPrivatePort);
    }

    // Otherwise, ask the user which port to use...
    if (selectedPort === undefined) {
        const items = possiblePorts.map(port => ({ label: port.PrivatePort.toString(), port }));

        // Sort ports in ascending order...
        items.sort((a, b) => a.port.PrivatePort - b.port.PrivatePort);

        /* eslint-disable-next-line @typescript-eslint/promise-function-async */
        const item = await captureBrowseCancelStep('port', telemetryProperties, () => ext.ui.showQuickPick(items, { placeHolder: localize('vscode-docker.commands.containers.browseContainer.selectContainerPort', 'Select the container port to browse to.') }));

        // NOTE: If the user cancels the prompt, then a UserCancelledError exception would be thrown.

        selectedPort = item.port;
    }

    telemetryProperties.selectedPort = selectedPort.PrivatePort;

    const protocol = commonSslPorts.some(commonPort => commonPort === selectedPort.PrivatePort) ? 'https' : 'http';
    const host = selectedPort.IP === '0.0.0.0' ? 'localhost' : selectedPort.IP;
    const url = `${protocol}://${host}:${selectedPort.PublicPort}`;

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.env.openExternal(vscode.Uri.parse(url));
}
