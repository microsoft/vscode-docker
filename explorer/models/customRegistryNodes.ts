import { ResourceManagementClient, SubscriptionClient, SubscriptionModels } from 'azure-arm-resource';
import * as moment from 'moment';
import * as path from 'path';
import { RequestClient } from 'reqclient';
import * as request from 'request-promise';
import * as vscode from 'vscode';
import * as ContainerModels from '../../node_modules/azure-arm-containerregistry/lib/models';
import { AsyncPool } from '../../utils/asyncpool';
import { MAX_CONCURRENT_REQUESTS } from '../../utils/constants'
import * as dockerHub from '../utils/dockerHubUtils';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';

export class CustomRegistryNode extends NodeBase {
    public type: RegistryType;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        private serverUri: string,
        private userName: string,
        private password: string
    ) {
        super(label);

        this.type = RegistryType.Custom;
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    private async isV2Registry(url: string): Promise<boolean> {
        try {
            // If this succeeds, it's a V2 registry
            request.get(`${url}/v2`);
            return true;
        } catch (err) {
            return false;
        }
    }

    // tslint:disable-next-line:max-func-body-length //asdf
    public async getChildren(element: CustomRegistryNode): Promise<CustomRepositoryNode[]> {
        const repoNodes: CustomRepositoryNode[] = [];
        let iconPath = {
            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
        };

        let client = new RequestClient({
            baseUrl: '',
            debugRequest: true, debugResponse: true,
            // oauth2: {
            //     user: this.userName,
            //     pass: this.password,
            //     //baseUrl: 'https://' + element.label + "/oauth2",
            //     fullResponse: true
            // },
            //sendImmediately: false,
            fullResponse: true
        });
        client.fullResponse = true;

        //let e2 = await request.get('https://' + element.label + "/v2");
        try {
            let e = await client.get(`${this.serverUri}/v2/_catalog`, {
                fullResponse: true
            });
            let f = e;
        } catch (error) {
            console.error(error);
        }

        repoNodes.push(new CustomRepositoryNode('localhost', 'customRepositoryNode', undefined/*asdf*/, this.serverUri, this.userName, this.password));
        return repoNodes;
    }

    //     let node: CustomRepositoryNode;

    //     // tslint:disable-next-line:no-http-string
    //     let url = 'http://' + element.label;

    //     if (!await this.isV2Registry(url)) {
    //         throw new Error('Does not appear to be a valid V2 registry');
    //     }

    //     // tslint:disable-next-line:no-http-string
    //     //url = 'http://localhost:5000';
    //     //        let a = await client.get(url);
    //     let a2 = await request.get(url);

    //     //      let b = await client.get(url + '/v2');
    //     let b2 = await request.get(url + '/v2');

    //     //    let c = await client.get(url + '/v2/_catalog');
    //     let c2 = await request.get(url + '/v2/_catalog');

    //     //let d2 = await request.get('https://' + element.label);
    //     let client = new RequestClient({
    //         baseUrl: '',
    //         debugRequest: true, debugResponse: true,
    //         oauth2: {
    //             user: "stephwereg", pass: "",
    //             baseUrl: 'https://' + element.label + "/oauth2",
    //             fullResponse: true
    //         },
    //         //sendImmediately: false,
    //         fullResponse: true
    //     });
    //     client.fullResponse = true;

    //     //let e2 = await request.get('https://' + element.label + "/v2");
    //     try {
    //         let e = await client.get('https://' + element.label + '/v2/_catalog', {
    //             fullResponse: true
    //         });
    //         let f = e;
    //     } catch (error) {
    //         console.error(error);
    //     }

    //     let f2 = await request.get('https://' + element.label + "/v2/_catalog");

    //     try {
    //         let response = await request(url, {

    //         });
    //     } catch (error) {
    //         let d = error;
    //     }

    //     // if (accessToken && refreshToken) {
    //     //     let refreshTokenARC;
    //     //     let accessTokenARC;

    //     //     await request.post('https://' + element.label + '/oauth2/exchange', {
    //     //         form: {
    //     //             grant_type: 'access_token_refresh_token',
    //     //             service: element.label,
    //     //             tenant: tenantId,
    //     //             refresh_token: refreshToken,
    //     //             access_token: accessToken
    //     //         }
    //     //     }, (err, httpResponse, body) => {
    //     //         if (body.length > 0) {
    //     //             refreshTokenARC = JSON.parse(body).refresh_token;
    //     //         } else {
    //     //             return [];
    //     //         }
    //     //     });

    //     //     // await request.post('https://' + element.label + '/oauth2/token', {
    //     //     //     form: {
    //     //     //         grant_type: 'refresh_token',
    //     //     //         service: element.label,
    //     //     //         scope: 'registry:catalog:*',
    //     //     //         refresh_token: refreshTokenARC
    //     //     //     }
    //     //     // }, (err, httpResponse, body) => {
    //     //     //     if (body.length > 0) {
    //     //     //         accessTokenARC = JSON.parse(body).access_token;
    //     //     //     } else {
    //     //     //         return [];
    //     //     //     }
    //     //     // });
    //     //     await request.get('https://' + element.label + '/v2/_catalog', {
    //     //         // auth: {
    //     //         //     bearer: accessTokenARC
    //     //         // }
    //     //     }, (err, httpResponse, body) => {
    //     //         if (body && body.length > 0) {
    //     //             const repositories = JSON.parse(body).repositories;
    //     //             // tslint:disable-next-line:prefer-for-of // Grandfathered in
    //     //             for (let i = 0; i < repositories.length; i++) {
    //     //                 node = new AzureRepositoryNode(repositories[i], "azureRepositoryNode");
    //     //                 node.accessTokenARC = accessTokenARC;
    //     //                 node.azureAccount = element.azureAccount;
    //     //                 node.password = element.password;
    //     //                 node.refreshTokenARC = refreshTokenARC;
    //     //                 node.registry = element.registry;
    //     //                 node.repository = element.label;
    //     //                 node.subscription = element.subscription;
    //     //                 node.userName = element.userName;
    //     //                 repoNodes.push(node);
    //     //             }
    //     //         }
    //     //     });
    //     // }

    //     //Note these are ordered by default in alphabetical order
    //     return repoNodes;
    // }
}

export class CustomRepositoryNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        private repository: dockerHub.Repository,
        private serverUri: string,
        private userName: string,
        private password: string
    ) {
        super(label);

        this.iconPath = {
            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
        }

    }

    // public accessTokenARC: string;
    // public refreshTokenARC: string;
    //public repository: string;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    public async getChildren(element: CustomRepositoryNode): Promise<CustomImageNode[]> {
        const imageNodes: CustomImageNode[] = [];
        let node: CustomImageNode;

        const myTags: dockerHub.Tag[] = await dockerHub.getRepositoryTags({ namespace: element.repository.namespace, name: element.repository.name });
        // tslint:disable-next-line:prefer-for-of // Grandfathered in
        for (let i = 0; i < myTags.length; i++) {
            node = new CustomImageNode('image', 'customImageTagAsdf'); //asdf `${ element.repository.name }: ${ myTags[i].name }`, 'dockerHubImageTag');
            node.password = element.password;
            node.userName = element.userName;
            //node.repository = element.repository;
            node.created = moment(new Date(myTags[i].last_updated)).fromNow();
            imageNodes.push(node);
        }

        return imageNodes;

    }

    // public async getChildren(element: CustomRepositoryNode): Promise<CustomImageNode[]> {
    //     const imageNodes: CustomImageNode[] = [];
    //     let node: CustomImageNode;
    //     let created: string = '';
    //     let refreshTokenARC;
    //     let accessTokenARC;
    //     let tags;

    //     const tenantId: string = element.subscription.tenantId;
    //     //        const { accessToken, refreshToken } = await acquireToken(session);

    //     // if (accessToken && refreshToken) {
    //     //     await request.post('https://' + element.repository + '/oauth2/exchange', {
    //     //         form: {
    //     //             grant_type: 'access_token_refresh_token',
    //     //             service: element.repository,
    //     //             tenant: tenantId,
    //     //             refresh_token: refreshToken,
    //     //             access_token: accessToken
    //     //         }
    //     //     }, (err, httpResponse, body) => {
    //     //         if (body.length > 0) {
    //     //             refreshTokenARC = JSON.parse(body).refresh_token;
    //     //         } else {
    //     //             return [];
    //     //         }
    //     //     });

    //     //     await request.post('https://' + element.repository + '/oauth2/token', {
    //     //         form: {
    //     //             grant_type: 'refresh_token',
    //     //             service: element.repository,
    //     //             scope: 'repository:' + element.label + ':pull',
    //     //             refresh_token: refreshTokenARC
    //     //         }
    //     //     }, (err, httpResponse, body) => {
    //     //         if (body.length > 0) {
    //     //             accessTokenARC = JSON.parse(body).access_token;
    //     //         } else {
    //     //             return [];
    //     //         }
    //     //     });

    //     await request.get('https://' + element.repository + '/v2/' + element.label + '/tags/list', {
    //         auth: {
    //             bearer: accessTokenARC
    //         }
    //     }, (err, httpResponse, body) => {
    //         if (err) { return []; }
    //         if (body.length > 0) {
    //             tags = JSON.parse(body).tags;
    //         }
    //     });

    //     const pool = new AsyncPool(MAX_CONCURRENT_REQUESTS);
    //     // tslint:disable-next-line:prefer-for-of // Grandfathered in
    //     for (let i = 0; i < tags.length; i++) {
    //         pool.addTask(async () => {
    //             let data = await request.get('https://' + element.repository + '/v2/' + element.label + ` / manifests / ${ tags[i] }`, {
    //                 auth: {
    //                     bearer: accessTokenARC
    //                 }
    //             });

    //             //Acquires each image's manifest to acquire build time.
    //             let manifest = JSON.parse(data);
    //             node = new CustomImageNode(`${ element.label }: ${ tags[i] }`, 'customImageNode');
    //             node.password = element.password;
    //             node.registry = element.registry;
    //             node.serverUrl = element.repository;
    //             node.subscription = element.subscription;
    //             node.userName = element.userName;
    //             node.created = moment(new Date(JSON.parse(manifest.history[0].v1Compatibility).created)).fromNow();
    //             imageNodes.push(node);
    //         });
    //     }
    //     await pool.runAll();

    //     function sortFunction(a: CustomImageNode, b: CustomImageNode): number {
    //         return a.created.localeCompare(b.created);
    //     }
    //     imageNodes.sort(sortFunction);
    //     return imageNodes;
    // }
}

export class CustomImageNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string
    ) {
        super(label);
    }

    public created: string;
    public password: string;
    public registry: ContainerModels.Registry;
    public serverUrl: string;
    public subscription: SubscriptionModels.Subscription;
    public userName: string;

    public getTreeItem(): vscode.TreeItem {
        let displayName: string = this.label;

        displayName = `${displayName}(${this.created})`;

        return {
            label: `${displayName}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
    }
}

export class CustomLoadingNode extends NodeBase {
    constructor() {
        super('Loading...');
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        }
    }
}

//asdf
// async function acquireToken(session: AzureSession): Promise<{ accessToken: string; refreshToken: string; }> {
//     return new Promise<{ accessToken: string; refreshToken: string; }>((resolve, reject) => {
//         const credentials: any = session.credentials;
//         const environment: any = session.environment;
//         // tslint:disable-next-line:no-function-expression // Grandfathered in
//         credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, function (err: any, result: { accessToken: string; refreshToken: string; }): void {
//             if (err) {
//                 reject(err);
//             } else {
//                 resolve({
//                     accessToken: result.accessToken,
//                     refreshToken: result.refreshToken
//                 });
//             }
//         });
//     });
// }

// async function getRepositories(username: string): Promise<Repository[]> {
//     let repos: Repository[];

//     dockerHubAPI.login('sweatherford', '6rC3q9LgxCvk').then((info) => {
//         console.log(`My Docker Hub login token is '${info.token}'!`);
//     });

//     let options = {
//         method: 'GET',
//         // tslint:disable-next-line:no-http-string
//         uri: `http: //localhost:5000/v2/users/${username}/repositories/`,
//         //uri: `https://hub.docker.com/v2/users/${username}/repositories/`,
//         headers: {
//             Authorization: 'JWT ' + _token.token
//         },
//         json: true
//     }

//     try {
//         repos = await request(options);
//     } catch (error) {
//         console.log(error);
//         vscode.window.showErrorMessage('Docker: Unable to retrieve Repositories');
//     }

//     return repos;
// }

// async function getRepositoryInfo(repository: Repository): Promise<any> {

//     let res: any;

//     let options = {
//         method: 'GET',
//         uri: `https://hub.docker.com/v2/repositories/${repository.namespace}/${repository.name}/`,
//         headers: {
//             Authorization: 'JWT ' + _token.token
//         },
//         json: true
//     }

//     try {
//         res = await request(options);
//     } catch (error) {
//         console.log(error);
//         vscode.window.showErrorMessage('Docker: Unable to get Repository Details');
//     }

//     return res;
// }

// async function getRepositoryTags(repository: Repository): Promise<Tag[]> {
//     let tagsPage: any;

//     let options = {
//         method: 'GET',
//         uri: `https://hub.docker.com/v2/repositories/${repository.namespace}/${repository.name}/tags?page_size=100&page=1`,
//         headers: {
//             Authorization: 'JWT ' + _token.token
//         },
//         json: true
//     }

//     try {
//         tagsPage = await request(options);
//     } catch (error) {
//         console.log(error);
//         vscode.window.showErrorMessage('Docker: Unable to retrieve Repository Tags');
//     }

//     return <Tag[]>tagsPage.results;

// }

// asdf was from dockerhub util
async function getRepositoryTags(serverUri: string, repository: dockerHub.Repository): Promise<dockerHub.Tag[]> {
    let tagsPage: any;

    let options = {
        method: 'GET',
        uri: `${serverUri}/v2/repositories/${repository.namespace}/${repository.name}/tags?page_size=100&page=1`,
        // headers: {
        //     Authorization: 'JWT ' + _token.token
        // },
        json: true
    }

    try {
        tagsPage = await request(options);
    } catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Docker: Unable to retrieve Repository Tags');
    }

    return <dockerHub.Tag[]>tagsPage.results;

}
