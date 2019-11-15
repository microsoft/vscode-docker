/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, TelemetryProperties } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { ContainerTreeItem } from "../../tree/containers/ContainerTreeItem";
import { captureCancelStep } from '../../utils/captureCancelStep';

type BrowseTelemetryProperties = TelemetryProperties & { possiblePorts?: number[], selectedPort?: number };

type ConfigureBrowseCancelStep = 'node' | 'port';

async function captureBrowseCancelStep<T>(cancelStep: ConfigureBrowseCancelStep, properties: BrowseTelemetryProperties, prompt: () => Promise<T>): Promise<T> {
    return await captureCancelStep(cancelStep, properties, prompt)
}

// NOTE: These ports are ordered in order of preference.
const commonWebPorts = [
    443,    // SSL
    80,     // HTTP
    3000,   // (Node.js) Express.js
    3001,   // (Node.js) Sails.js
    5001,   // (.NET Core) ASP.NET SSL
    5000,   // (.NET Core) ASP.NET HTTP
    8080,   // (Node.js)
    8081    // (Node.js)
];

const commonSslPorts = [
    443,    // SSL
    5001    // (.NET Core) ASP.NET SSL
];

function parsePortAndProtocol(portAndProtocol: string): { port: number, protocol: string | undefined } | undefined {
    const splitPortAndProtocol = portAndProtocol.split('/');

    if (splitPortAndProtocol.length > 0) {
        const port = Number.parseInt(splitPortAndProtocol[0], 10);

        if (!Number.isNaN(port)) {
            return {
                port,
                protocol: splitPortAndProtocol.length > 1 ? splitPortAndProtocol[1].toLowerCase() : undefined
            };
        }
    }

    return undefined;
}

export async function browseContainer(context: IActionContext, node?: ContainerTreeItem): Promise<void> {
    const telemetryProperties = <BrowseTelemetryProperties>context.telemetry.properties;

    if (!node) {
        node = await captureBrowseCancelStep('node', telemetryProperties, () => ext.containersTree.showTreeItemPicker<ContainerTreeItem>(ContainerTreeItem.runningContainerRegExp, context));
    }

    const inspectInfo = await node.getContainer().inspect();

    const ports = inspectInfo && inspectInfo.NetworkSettings && inspectInfo.NetworkSettings.Ports || {};
    const possiblePorts =
        Object.keys(ports)
              .map(portAndProtocol => ({ mappings: ports[portAndProtocol], containerPort: parsePortAndProtocol(portAndProtocol) }))
              // Exclude port designations we cannot recognize...
              .filter(port => port.containerPort !== undefined)
              // Exclude ports that are non-TCP-based (which should be the default)...
              .filter(port => port.containerPort.protocol === undefined || port.containerPort.protocol === 'tcp')
              // Exclude ports not mapped to the host...
              .filter(port => port.mappings && port.mappings.length > 0);

    telemetryProperties.possiblePorts = possiblePorts.map(port => port.containerPort.port);

    if (possiblePorts.length === 0) {
        // tslint:disable-next-line: no-floating-promises
        ext.ui.showWarningMessage('No valid ports were mapped from the container to the host.');

        return;
    }

    let selectedPort =
        possiblePorts.length === 1
            // If there's just a single port, assume that one...
            ? possiblePorts[0]
            // Otherwise, prefer a common port (in order of preference)...
            : commonWebPorts
                .map(port => possiblePorts.find(possiblePort => port === possiblePort.containerPort.port))
                .filter(possiblePort => possiblePort !== undefined)[0];

    // Otherwise, ask the user which port to use...
    if (selectedPort === undefined) {
        const items = possiblePorts.map(port => ({ label: port.containerPort.port.toString(), port }));

        // Sort ports in ascending order...
        items.sort((a, b) => a.port.containerPort.port - b.port.containerPort.port);

        const item = await captureBrowseCancelStep('port', telemetryProperties, () => ext.ui.showQuickPick(items, { placeHolder: 'Select the container port to browse to.' }));

        // NOTE: If the user cancels the prompt, then a UserCancelledError exception would be thrown.

        selectedPort = item.port;
    }

    telemetryProperties.selectedPort = selectedPort.containerPort.port;

    const mappedPort = selectedPort.mappings[0];

    const protocol = commonSslPorts.find(port => port === selectedPort.containerPort.port) !== undefined ? 'https' : 'http';
    const host = mappedPort.HostIp === '0.0.0.0' ? 'localhost' : mappedPort.HostIp;
    const url = `${protocol}://${host}:${mappedPort.HostPort}`;

    vscode.env.openExternal(vscode.Uri.parse(url));
}
