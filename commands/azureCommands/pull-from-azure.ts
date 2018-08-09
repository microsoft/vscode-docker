import vscode = require('vscode');
import { ExecuteCommandRequest } from 'vscode-languageclient/lib/main';
import { ImageNode } from '../../explorer/models/imageNode';
import { reporter } from '../../telemetry/telemetry';
import { ImageItem, quickPickImage } from '../utils/quick-pick-image';
//FOR TELEMETRY DATA
const teleCmdId: string = 'vscode-docker.image.pullFromAzure';
//const { exec } = require('child_process');

export async function pullFromAzure(context?: ImageNode): Promise<any> {
    //1. call loginCredentials(),which gives us username and password
    //2. docker login with username and password
    //3. docker pull
}
