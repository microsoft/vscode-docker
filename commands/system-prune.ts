import vscode = require('vscode');
import { getCoreNodeModule } from '../explorer/utils/utils';
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';

const teleCmdId: string = 'vscode-docker.system.prune';

export async function systemPrune(): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const terminal = ext.terminalProvider.createTerminal("docker system prune");
    const semver = getCoreNodeModule('semver');

    try {

        if (configOptions.get('promptOnSystemPrune', true)) {
            let res = await vscode.window.showWarningMessage<vscode.MessageItem>('Remove all unused containers, volumes, networks and images (both dangling and unreferenced)?',
                { title: 'Yes' },
                { title: 'Cancel', isCloseAffordance: true }
            );

            if (!res || res.isCloseAffordance) {
                return;
            }
        }

        const info = await docker.getEngineInfo();

        // in docker 17.06.1 and higher you must specify the --volumes flag
        if (semver.gte(info.ServerVersion, '17.6.1', true)) {
            terminal.sendText(`docker system prune --volumes -f`);
        } else {
            terminal.sendText(`docker system prune -f`);
        }

        terminal.show();

    } catch (error) {
        vscode.window.showErrorMessage('Unable to connect to Docker, is the Docker daemon running?');
        console.log(error);
    }

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
