import vscode = require('vscode');
import { reporter } from '../telemetry/telemetry';
import { dockerExplorerProvider } from '../dockerExtension';
import { docker } from './utils/docker-endpoint';

const teleCmdId: string = 'vscode-docker.system.prune';

export async function systemPrune() {
    
    const msg = 'Docker System Prune: Remove all unused containers, volumes, networks and images (both dangling and unreferenced)?';
    const res = await vscode.window.showWarningMessage(msg, 'Yes', 'No');
    if (res === 'Yes') {
        const info = await docker.getEngineInfo();
        const terminal = vscode.window.createTerminal("docker system prune");
        const semver = require(`${vscode.env.appRoot}/node_modules/semver`);

        // in docker 17.06.1 and higher you must specify the --volumes flag
        if (semver.gte(info.ServerVersion, '17.6.1', true)) {
            terminal.sendText(`docker system prune --volumes -f`);
        } else {
            terminal.sendText(`docker system prune -f`);
        }
        
        terminal.show();
        dockerExplorerProvider.refreshContainers(true);
        dockerExplorerProvider.refreshImages(true);
        if (reporter) {
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
    }
}