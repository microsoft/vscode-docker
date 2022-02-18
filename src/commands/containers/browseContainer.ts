/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem, TelemetryProperties } from "vscode-azureextensionui";
import { DockerPort } from '../../docker/Containers';
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { ContainerTreeItem } from "../../tree/containers/ContainerTreeItem";

type BrowseTelemetryProperties = TelemetryProperties & { possiblePorts?: string, selectedPort?: string };

// NOTE: These ports are ordered in order of preference.
const commonWebPorts = [
    443,    // SSL
    80,     // HTTP
    3000,   // (Node.js) Express.js
    3001,   // (Node.js) Sails.js
    5001,   // (.NET Core) ASP.NET SSL
    5000,   // (.NET Core) ASP.NET HTTP and (Python) Flask
    5002,   // (Python) Flask (newer Flask apps)
    8000,   // (Python) Django and FastAPI
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
        await ext.containersTree.refresh(context);
        node = await ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.containers.browseContainer.noContainers', 'No running containers are available to open in a browser')
        });
    }

    const ports = node.ports ?? [];
    const dupedPossiblePorts = ports.filter(port => port.PublicPort && port.PrivatePort) // Ports must be defined (not falsy)
        .filter(port => port.Type ?? 'tcp' === 'tcp') // Type must be undefined or tcp
        .filter(port => port.IP); // IP must be defined (not falsy)

    // There can be multiple ports that are bound to localhost, so let's remove duplicates
    const possiblePorts: DockerPort[] = Array.from(new Set(
        // Type cleanup in order to dedupe properly
        dupedPossiblePorts.map(port => {
            return {
                ...port,
                Type: 'tcp', // Already established that it's either undefined or tcp, let's make it always tcp
                IP: isLocalhostBinding(port.IP) ? 'localhost' : port.IP, // Turn any localhost IP bindings into "localhost"
            };
        })
    ));

    telemetryProperties.possiblePorts = possiblePorts.map(port => port.PrivatePort).toString();

    if (possiblePorts.length === 0) {
        void context.ui.showWarningMessage(localize('vscode-docker.commands.containers.browseContainer.noPorts', 'No valid ports are available.'));
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
        const items: IAzureQuickPickItem<DockerPort>[] = possiblePorts.map(port => (
            {
                label: port.PrivatePort.toString(),
                description: port.IP,
                data: port,
            }
        ));

        // Sort ports in ascending order...
        items.sort((a, b) => a.data.PrivatePort - b.data.PrivatePort);

        /* eslint-disable-next-line @typescript-eslint/promise-function-async */
        const item = await context.ui.showQuickPick(items, { stepName: 'port', placeHolder: localize('vscode-docker.commands.containers.browseContainer.selectContainerPort', 'Select the container port to browse to.') });

        // NOTE: If the user cancels the prompt, then a UserCancelledError exception would be thrown.

        selectedPort = item.data;
    }

    telemetryProperties.selectedPort = selectedPort.PrivatePort.toString();

    const protocol = commonSslPorts.some(commonPort => commonPort === selectedPort.PrivatePort) ? 'https' : 'http';
    const url = `${protocol}://${selectedPort.IP}:${selectedPort.PublicPort}`;

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.env.openExternal(vscode.Uri.parse(url));
}

function isLocalhostBinding(ip: string): boolean {
    return (
        ip === '0.0.0.0' || ip === '::' || // IP is standard localhost binding (IPv4 or IPv6)
        ip === '127.0.0.1' || ip === '::1' // IP is a loopback binding (IPv4 or IPv6)
    );
}
