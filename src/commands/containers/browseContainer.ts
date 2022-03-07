/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, IAzureQuickPickItem, TelemetryProperties } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
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

interface BrowsablePort {
    host: string;
    hostPort: number;
    containerPort: number;
}

function toBrowsablePort(port: DockerPort): BrowsablePort {
    let host: string = port.IP;
    if (
        host === '0.0.0.0' || host === '::' || // IP is standard binding (IPv4 or IPv6)
        host === '127.0.0.1' || host === '::1' // IP is a common loopback binding (IPv4 or IPv6)
    ) {
        // Remap the above to 'localhost' since that's what we'll want to launch
        host = 'localhost';
    }

    return {
        host: host,
        hostPort: port.PublicPort,
        containerPort: port.PrivatePort,
    };
}

function dedupeBrowsablePorts(browsablePorts: BrowsablePort[]): BrowsablePort[] {
    const results: BrowsablePort[] = [];

    for (const browsablePort of browsablePorts) {
        // Dedupe based on host and *container* port. If both are the same, it won't be added. The host port is ignored,
        // because when asking the user we present the *container* port, since the host port is often random.
        if (results.some(p => p.host === browsablePort.host && p.containerPort === browsablePort.containerPort)) {
            continue;
        }

        results.push(browsablePort);
    }

    return results;
}

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

    // There can be multiple ports that are bound to localhost, so let's remove duplicates by sending to and from a Set
    const browsablePorts: BrowsablePort[] = dedupeBrowsablePorts(dupedPossiblePorts.map(toBrowsablePort));

    telemetryProperties.possiblePorts = browsablePorts.map(port => port.containerPort).toString();

    if (browsablePorts.length === 0) {
        void context.ui.showWarningMessage(localize('vscode-docker.commands.containers.browseContainer.noPorts', 'No valid ports are available.'));
        return;
    }

    let selectedPort: BrowsablePort;
    if (browsablePorts.length === 1) {
        // If there's just a single port, assume that one...
        selectedPort = browsablePorts[0];
    } else {
        // Otherwise, prefer a common port (in order of preference)...
        const preferredCommonPrivatePort: number | undefined = commonWebPorts.find(commonPort => browsablePorts.some(browsablePort => commonPort === browsablePort.containerPort));
        selectedPort = browsablePorts.find(browsablePort => browsablePort.containerPort === preferredCommonPrivatePort);
    }

    // Otherwise, ask the user which port to use...
    if (selectedPort === undefined) {
        const items: IAzureQuickPickItem<BrowsablePort>[] = browsablePorts.map(port => (
            {
                label: port.containerPort.toString(),
                description: `${port.host}:${port.hostPort}`,
                data: port,
            }
        ));

        // Sort ports in ascending order...
        items.sort((a, b) => a.data.containerPort - b.data.containerPort);

        /* eslint-disable-next-line @typescript-eslint/promise-function-async */
        const item = await context.ui.showQuickPick(items, { stepName: 'port', placeHolder: localize('vscode-docker.commands.containers.browseContainer.selectContainerPort', 'Select the container port to browse to.') });

        // NOTE: If the user cancels the prompt, then a UserCancelledError exception would be thrown.

        selectedPort = item.data;
    }

    telemetryProperties.selectedPort = selectedPort.containerPort.toString();

    const protocol = commonSslPorts.some(commonPort => commonPort === selectedPort.containerPort) ? 'https' : 'http';
    const url = `${protocol}://${selectedPort.host}:${selectedPort.hostPort}`;

    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.env.openExternal(vscode.Uri.parse(url));
}
