import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.deploy';

export function deployImage() {
    quickPickImage(false).then(function (selectedItem: ImageItem) {
        if (selectedItem) {
            //get parameters...or generate on fly?
            //create bash file... or ps1 file
            //or create from ARM template?
            //push image to registry
            let terminal = vscode.window.createTerminal(selectedItem.label);
            terminal.sendText(`docker push ${selectedItem.label}`);
            terminal.show();
            if (reporter) {
                reporter.sendTelemetryEvent('command', {
                    command: teleCmdId
                });
            }
        };
    });
}


var groupName = '';
var location = 'westus';
var registryName = 'myContainerRegistry';
var registryUrl = 'https://azure.something.com'
var planName = 'planName';
var sku = "S1";
var webName = 'webName';
var port = '3000';
var imageName = 'imageName'

// shell each instance, check results for json, error...

const bashTemplate: string =
    `
    docker run -it --rm azuresdk/azure-cli-python:latest az login
    docker run -it --rm azuresdk/azure-cli-python:latest az group create --name ${groupName} --location ${location}
    docker run -it --rm azuresdk/azure-cli-python:latest az acr create --name ${registryName} --sku Basic --resource-group ${groupName} --location ${location} 
    docker push ...
    docker run -it --rm azuresdk/azure-cli-python:latest az appservice plan create --name ${planName} --is-linux --sku ${sku} --resource-group ${groupName} --location ${location} 
    docker run -it --rm azuresdk/azure-cli-python:latest az webapp create --name ${webName} --plan ${planName} --resource-group ${groupName} --location ${location} 
    docker run -it --rm azuresdk/azure-cli-python:latest az webapp config appsettings set --name ${webName} --settings PORT=${port} --resource-group ${groupName} --location ${location} 
    docker run -it --rm azuresdk/azure-cli-python:latest az webapp config container set --name $ ${webName} --docker-custom-image-name ${imageName} --docker-registry-server-url ${registryUrl} --resource-group ${groupName} --location ${location} 
    docker run -it --rm azuresdk/azure-cli-python:latest az webapp config container set --docker-custom-image-name asdf --docker-registry-server-url
    
`;
    
