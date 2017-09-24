import vscode = require('vscode');
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';

const teleCmdId: string = 'vscode-docker.system.prune';

export async function systemPrune() {

    const terminal = vscode.window.createTerminal("docker system prune");
    const semver = require(`${vscode.env.appRoot}/node_modules/semver`);

    try {
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
        reporter.sendTelemetryEvent('command', {
            command: teleCmdId
        });
    }
}