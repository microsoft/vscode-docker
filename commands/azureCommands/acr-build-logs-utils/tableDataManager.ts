import ContainerRegistryManagementClient from "azure-arm-containerregistry";
import { Registry, Run, RunGetLogResult, RunListResult } from "azure-arm-containerregistry/lib/models";
import request = require('request-promise');
import { registryRequest } from "../../../explorer/models/commonRegistryUtils";
import { Manifest } from "../../../explorer/utils/dockerHubUtils";
import { acquireACRAccessTokenFromRegistry } from "../../../utils/Azure/acrTools";
/** Class to manage data and data acquisition for logs */
export class LogData {
    public registry: Registry;
    public resourceGroup: string;
    public links: { requesting: boolean, url?: string }[];
    public logs: Run[];
    public client: ContainerRegistryManagementClient;
    private nextLink: string;

    constructor(client: ContainerRegistryManagementClient, registry: Registry, resourceGroup: string) {
        this.registry = registry;
        this.resourceGroup = resourceGroup;
        this.client = client;
        this.logs = [];
        this.links = [];
    }
    /** Acquires Links from an item number corresponding to the index of the corresponding log, caches
     * logs in order to avoid unecessary requests if opened multiple times.
     */
    public async getLink(itemNumber: number): Promise<string> {
        if (itemNumber >= this.links.length) {
            throw new Error('Log for which the link was requested has not been added');
        }

        if (this.links[itemNumber].url) {
            return this.links[itemNumber].url;
        }

        //If user is simply clicking many times impatiently it makes sense to only have one request at once
        if (this.links[itemNumber].requesting) { return 'requesting' }

        this.links[itemNumber].requesting = true;
        const temp: RunGetLogResult = await this.client.runs.getLogSasUrl(this.resourceGroup, this.registry.name, this.logs[itemNumber].runId);
        this.links[itemNumber].url = temp.logLink;
        this.links[itemNumber].requesting = false;
        return this.links[itemNumber].url
    }

    //contains(TaskName, 'testTask')
    //`TaskName eq 'testTask'
    //
    /** Loads logs from azure
     * @param loadNext Determines if the next page of logs should be loaded, will throw an error if there are no more logs to load
     * @param removeOld Cleans preexisting information on links and logs imediately before new requests, if loadNext is specified
     * the next page of logs will be saved and all preexisting data will be deleted.
     * @param filter Specifies a filter for log items, if run Id is specified this will take precedence
     */
    public async loadLogs(loadNext: boolean, removeOld?: boolean, filter?: Filter): Promise<void> {
        let runListResult: RunListResult;
        let options: any = {};
        if (filter && Object.keys(filter).length) {
            if (!filter.runId) {
                options.filter = await this.parseFilter(filter);
                runListResult = await this.client.runs.list(this.resourceGroup, this.registry.name, options);
            } else {
                runListResult = [];
                runListResult.push(await this.client.runs.get(this.resourceGroup, this.registry.name, filter.runId));
            }
        } else {
            if (loadNext) {
                if (this.nextLink) {
                    runListResult = await this.client.runs.listNext(this.nextLink);
                } else {
                    throw new Error('No more logs to show');
                }
            } else {
                runListResult = await this.client.runs.list(this.resourceGroup, this.registry.name);
            }
        }
        if (removeOld) { this.clearLogItems() }
        this.nextLink = runListResult.nextLink;
        this.addLogs(runListResult);
    }

    public addLogs(logs: Run[]): void {
        this.logs = this.logs.concat(logs);

        const itemCount = logs.length;
        for (let i = 0; i < itemCount; i++) {
            this.links.push({ 'requesting': false });
        }
    }

    public clearLogItems(): void {
        this.logs = [];
        this.links = [];
        this.nextLink = '';
    }

    public hasNextPage(): boolean {
        return this.nextLink !== undefined;
    }

    private async parseFilter(filter: Filter): Promise<string> {
        let parsedFilter = "";
        if (filter.task) { //Task id
            parsedFilter = `TaskName eq '${filter.task}'`;
        } else if (filter.image) { //Image
            let items: string[] = filter.image.split(':')
            const { acrAccessToken } = await acquireACRAccessTokenFromRegistry(this.registry, 'repository:' + items[0] + ':pull');
            let digest;
            await request.get('https://' + this.registry.loginServer + `/v2/${items[0]}/manifests/${items[1]}`, {
                auth: {
                    bearer: acrAccessToken
                },
                accept: {
                    application: 'vnd.docker.distribution.manifest.v2+json'
                }
            }, (err, httpResponse, body) => {
                digest = httpResponse.headers['docker-content-digest'];
            });

            //let manifest: any = await registryRequest<any>(this.registry.loginServer, `v2/${items[0]}/manifests/${items[1]}`, { bearer: acrAccessToken });
            if (parsedFilter.length > 0) { parsedFilter += ' and '; }
            parsedFilter += `contains(OutputImageManifests, '${items[0]}@${digest}')`;
        }
        return parsedFilter;
    }
}

export interface Filter {
    image?: string;
    runId?: string;
    task?: string;
}
