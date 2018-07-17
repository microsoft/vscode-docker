import vscode = require('vscode');
import { ContainerItem, quickPickContainer } from './utils/quick-pick-container';
import { ContainerNode } from '../explorer/models/containerNode';
import { reporter } from '../telemetry/telemetry';
import { createTerminal } from './utils/create-terminal';
const teleCmdId: string = 'vscode-docker.container.show-logs';

export async function showLogsContainer(context?: ContainerNode) {

    let containerToLog: Docker.ContainerDesc;

    if (context && context.containerDesc) {
        containerToLog = context.containerDesc;
    } else {
        const opts = {
            "filters": {
                "status": ["running"]
            }
        };
        const selectedItem: ContainerItem = await quickPickContainer(false, opts);
        if (selectedItem) {
            containerToLog = selectedItem.containerDesc;
        }
    }

    if (containerToLog) {
        const terminal = createTerminal(containerToLog.Image);
        terminal.sendText(`docker logs -f ${containerToLog.Id}`);
        terminal.show();
        if (reporter) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    }
}
