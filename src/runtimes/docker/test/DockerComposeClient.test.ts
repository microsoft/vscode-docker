/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';

import { DockerComposeClient } from '../clients/DockerComposeClient/DockerComposeClient';
import { ShellStreamCommandRunnerFactory } from '../commandRunners/shellStream';
import {
    CommonOrchestratorCommandOptions,
    ConfigCommandOptions,
    DownCommandOptions,
    LogsCommandOptions,
    RestartCommandOptions,
    StartCommandOptions,
    StopCommandOptions,
    UpCommandOptions
} from '../contracts/ContainerOrchestratorClient';
import { AccumulatorStream } from '../utils/AccumulatorStream';
import { Bash, Cmd, NoShell, Powershell } from '../utils/spawnStreamAsync';

const commonOptions: CommonOrchestratorCommandOptions = {
    files: ['docker-compose.yml'],
};

xdescribe('DockerComposeClient', () => {
    const client = new DockerComposeClient();
    const cwd = 'TODO';
    const runnerFactory = new ShellStreamCommandRunnerFactory({
        cwd: cwd,
        onCommand: (command: string) => { console.log(`Executing ${command}`); },
    });
    const runner = runnerFactory.getCommandRunner();

    it('Should support up command', async () => {
        const options: UpCommandOptions = {
            ...commonOptions,
            detached: true,
            build: true,
        };

        await runner(client.up(options));
    });

    it('Should support stop command', async () => {
        const options: StopCommandOptions = {
            ...commonOptions,
        };

        await runner(client.stop(options));
    });

    it('Should support start command', async () => {
        const options: StartCommandOptions = {
            ...commonOptions,
        };

        await runner(client.start(options));
    });

    it('Should support restart command', async () => {
        const options: RestartCommandOptions = {
            ...commonOptions,
        };

        await runner(client.restart(options));
    });

    it('Should support logs command', async () => {
        const options: LogsCommandOptions = {
            ...commonOptions,
        };

        const accumulator = new AccumulatorStream();
        const logsCRF = new ShellStreamCommandRunnerFactory({
            cwd: cwd,
            stdOutPipe: accumulator,
            onCommand: (command: string) => { console.log(`Executing ${command}`); },
        });

        await logsCRF.getStreamingCommandRunner()(client.logs(options));
        const logs = await accumulator.getString();
        expect(logs).to.be.ok;
    });

    it('Should support down command', async () => {
        const options: DownCommandOptions = {
            ...commonOptions,
        };

        await runner(client.down(options));
    });

    it('Should support config command', async () => {
        const options: ConfigCommandOptions = {
            ...commonOptions,
            configType: 'services',
        };

        const result = await runner(client.config(options));
        expect(result).to.be.ok;
        expect(result).to.contain('registry');
    });
});

describe('DockerComposeClient (unit)', () => {
    const client = new DockerComposeClient();
    client.composeV2 = false;

    it('Should produce the expected lack of quoting/escaping customOptions', async () => {
        const options: UpCommandOptions = {
            ...commonOptions,
            detached: true,
            build: true,
            customOptions: '--timeout 10 --wait'
        };

        const commandResponse = await client.up(options);
        const pwshQuoted = new Powershell().quote(commandResponse.args);
        const cmdQuoted = new Cmd().quote(commandResponse.args);
        const bashQuoted = new Bash().quote(commandResponse.args);
        const noShellQuotedWindows = new NoShell(true).quote(commandResponse.args);
        const noShellQuotedLinux = new NoShell(false).quote(commandResponse.args);

        expect(pwshQuoted).to.deep.equal(['--file', '\'docker-compose.yml\'', 'up', '--detach', '--build', '--timeout 10 --wait']);
        expect(cmdQuoted).to.deep.equal(['--file', '"docker-compose.yml"', 'up', '--detach', '--build', '--timeout 10 --wait']);
        expect(bashQuoted).to.deep.equal(['--file', '\'docker-compose.yml\'', 'up', '--detach', '--build', '--timeout 10 --wait']);
        expect(noShellQuotedWindows).to.deep.equal(['--file', '"docker-compose.yml"', 'up', '--detach', '--build', '--timeout 10 --wait']);
        expect(noShellQuotedLinux).to.deep.equal(['--file', 'docker-compose.yml', 'up', '--detach', '--build', '--timeout 10 --wait']);
    });
});
