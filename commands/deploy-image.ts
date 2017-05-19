import vscode = require('vscode');
import { ImageItem, quickPickImage } from './utils/quick-pick-image';
import { reporter } from '../telemetry/telemetry';
import * as jmespath from 'jmespath';
import * as cp from 'child_process';
import * as copypaste from 'copy-paste';
import * as open from 'open';

interface GroupItem extends vscode.QuickPickItem {
    name: string,
    location:string
}

const locations: string[] = [
    'eastasia',
    'southeastasia',
    'centralus',
    'eastus',
    'eastus2',
    'westus',
    'northcentralus',
    'southcentralus',
    'northeurope',
    'westeurope',
    'japanwest',
    'japaneast',
    'brazilsouth',
    'australiaeast',
    'australiasoutheast',
    'southindia',
    'centralindia',
    'westindia',
    'canadacentral',
    'canadaeast',
    'uksouth',
    'ukwest',
    'westcentralus',
    'westus2',
    'koreacentral',
    'koreasouth'
];

const locationsQuickPick: vscode.QuickPickItem[] = [
    {label: 'eastasia', description: '', detail: ''},
    {label: 'southeastasia', description: '', detail: ''},
    {label: 'centralus', description: '', detail: ''},
    {label: 'eastus', description: '', detail: ''},
    {label: 'eastus2', description: '', detail: ''},
    {label: 'westus', description: '', detail: ''},
    {label: 'northcentralus', description: '', detail: ''},
    {label: 'southcentralus', description: '', detail: ''},
    {label: 'northeurope', description: '', detail: ''},
    {label: 'westeurope', description: '', detail: ''},
    {label: 'japanwest', description: '', detail: ''},
    {label: 'japaneast', description: '', detail: ''},
    {label: 'brazilsouth', description: '', detail: ''},
    {label: 'australiaeast', description: '', detail: ''},
    {label: 'australiasoutheast', description: '', detail: ''},
    {label: 'southindia', description: '', detail: ''},
    {label: 'centralindia', description: '', detail: ''},
    {label: 'westindia', description: '', detail: ''},
    {label: 'canadacentral', description: '', detail: ''},
    {label: 'canadaeast', description: '', detail: ''},
    {label: 'uksouth', description: '', detail: ''},
    {label: 'ukwest', description: '', detail: ''},
    {label: 'westcentralus', description: '', detail: ''},
    {label: 'westus2', description: '', detail: ''},
    {label: 'koreacentral', description: '', detail: ''},
    {label: 'koreasouth', description: '', detail: ''}
];
    

const teleCmdId: string = 'vscode-docker.deploy';

function azLogin(): Promise<string> {
    return new Promise((resolve, reject) => {
        let enterCodeString = 'enter the code ';
        let authString = ' to authenticate.';
        let signInMessage = 'The code {0} has been copied to your clipboard. Click Login and paste in the code to authenticate.';

        let ls = cp.spawn('az', ['login']);

        ls.stdout.on('data', function (data) {
            // should return list of subscriptions
            resolve(data.toString());
        });

        ls.stderr.on('data', function (data: Uint8Array) {
            var d: string = data.toString();

            if (d.includes('https://aka.ms/devicelogin', 0)) {
                var codeCopied = d.substring(d.indexOf(enterCodeString) + enterCodeString.length).replace(authString, '').trim();
                copypaste.copy(codeCopied);

                vscode.window.showInformationMessage(signInMessage.replace('{0}', codeCopied), { title: 'Login' }).then(function (btn) {
                    if (btn && btn.title == 'Login') {
                        vscode.window.setStatusBarMessage('Logging in...');
                        open('https://aka.ms/devicelogin');
                    }
                });

            }
        });

        ls.on('exit', function (code) {
            resolve(null);
        });
    });
}

function createGroupItem(label: string, location: string): GroupItem {
    return <GroupItem>{
        label: label,
        location: location
    };
}

// function getGroup(): Thenable<GroupItem> {
//     return new Promise((resolve, reject) => {

//         let ls = cp.spawn('az', ['group', 'list']);
        
//         ls.stdout.on('data', function (data) {
//             let qpi: GroupItem[] = [];
            
//             JSON.parse(data.toString()).forEach(element => {
//                 qpi.push(createGroupItem(element.name, element.location));
//             });

//             return vscode.window.showQuickPick(qpi, { placeHolder: 'Choose Resource Group or Create New' }).then((groupItem: GroupItem) => {
//                 if (groupItem) {
//                     if (groupItem.location) {
//                         return(groupItem);
//                     }
//                     // else new group
//                     vscode.window.showQuickPick(locationsQuickPick, {placeHolder: 'Choose Location'}).then((location) => {
//                         if (location) {
//                             groupItem.location = location.label;
//                             return(groupItem);
//                         } else {
//                             return Promise.reject(null);
//                         }
//                     });
//                 } else {
//                     return Promise.reject(null);
//                 }
//             });
//         });

//         ls.stderr.on('data', function (data: Uint8Array) {
//             //console.log('stderr data: ' + data);
//             reject(null);
//         });

//         ls.on('exit', function (code) {
//             //console.log('child process exited with code ' + code);
//             resolve(null);
//         });

//     });
// }

// function azCreateGroup(): Thenable<{ groupName: string, location: string }> {

//     return new Promise((resolve, reject) => {
//         getGroup().then((groupItem: GroupItem) => {
//             console.log(groupItem);
//         });
//         // let ls = cp.spawn('az', ['group', 'create', '-o', 'json', '-g', 'stickerapp-rg']);
//         // ls.stdout.on('data', function (data) {
//         //     //console.log('stdout data: ' + data);
//         //     resolve(data.toString());
//         // });

//         // ls.stderr.on('data', function (data: Uint8Array) {
//         //     //console.log('stderr data: ' + data);
//         //     reject(null);
//         // });

//         // ls.on('exit', function (code) {
//         //     //console.log('child process exited with code ' + code);
//         //     resolve(null);
//         // });

//     })
// }

async function azSetSubscription(subscriptions: string): Promise<string> {
    let qpi: vscode.QuickPickItem[] = [];

    JSON.parse(subscriptions).forEach(element => {
        qpi.push(element.name);
    });

    if (qpi.length > 0) {
        vscode.window.showQuickPick(qpi, { placeHolder: 'Choose Subscription' }).then((value) => {

            return new Promise((resolve, reject) => {
                const ls = cp.spawn('az', ['account', 'set', '--subscription', value.toString()]);
                ls.stdout.on('data', function (data) {
                    resolve(value.toString());
                });

                ls.stderr.on('data', function (data: Uint8Array) {
                    reject(null);
                });

                ls.on('exit', function (code) {
                    resolve(null);
                });

            });
        });
    } else {
        return Promise.reject(null);
    }
}

export async function deployImage() {

    const subscriptions: string = await azLogin();
    const subscription: string = await azSetSubscription(subscriptions);
    console.log(subscription);
    
    //const loc: string = azGetLocation(subscription);

    // quickPickImage(false).then((selectedItem: ImageItem) => {
    //     if (selectedItem) {
    //         const subscriptions: string = await azLogin();
    //         await azSetSubscription(subscriptions);
    //         // const loc: string = await azGetLocation();
    //         // const group: string = await azCreateGroup();
    //         // const 
    //         // const acr: string = await azCreateACR(group);
    //         // const plan: string = await azCreatePlan(group, loc);
    //         // const site: string = await azCreateSite(plan, group, loc);
    //         // await azSetSiteSettings(site, group, loc);
    //         // await azSetContainer(site, group, loc);

    // }});
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



