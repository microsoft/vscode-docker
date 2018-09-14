import ContainerRegistryManagementClient from "azure-arm-containerregistry";
import { Build, BuildGetLogResult, BuildListResult, Registry } from "azure-arm-containerregistry/lib/models";
import request = require('request-promise');
import { registryRequest } from "../../../explorer/models/commonRegistryUtils";
import { Manifest } from "../../../explorer/utils/dockerHubUtils";
import { acquireACRAccessTokenFromRegistry } from "../../../utils/Azure/acrTools";
/** Class to manage data and data acquisition for logs */
export class LogData {
    public registry: Registry;
    public resourceGroup: string;
    public links: { requesting: boolean, url?: string }[];
    public logs: Build[];
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
        const temp: BuildGetLogResult = await this.client.builds.getLogLink(this.resourceGroup, this.registry.name, this.logs[itemNumber].buildId);
        this.links[itemNumber].url = temp.logLink;
        this.links[itemNumber].requesting = false;
        return this.links[itemNumber].url
    }

    //contains(BuildTaskName, 'testTask')
    //`BuildTaskName eq 'testTask'
    //
    /** Loads logs from azure
     * @param loadNext Determines if the next page of logs should be loaded, will throw an error if there are no more logs to load
     * @param removeOld Cleans preexisting information on links and logs imediately before new requests, if loadNext is specified
     * the next page of logs will be saved and all preexisting data will be deleted.
     * @param filter Specifies a filter for log items, if build Id is specified this will take precedence
     */
    public async loadLogs(loadNext: boolean, removeOld?: boolean, filter?: Filter): Promise<void> {
        let buildListResult: BuildListResult;
        let options: any = {};
        if (filter && Object.keys(filter).length) {
            if (!filter.buildId) {
                options.filter = await this.parseFilter(filter);
                buildListResult = await this.client.builds.list(this.resourceGroup, this.registry.name, options);
            } else {
                buildListResult = [];
                buildListResult.push(await this.client.builds.get(this.resourceGroup, this.registry.name, filter.buildId));
            }
        } else {
            if (loadNext) {
                if (this.nextLink) {
                    buildListResult = await this.client.builds.listNext(this.nextLink);
                } else {
                    throw new Error('No more logs to show');
                }
            } else {
                buildListResult = await this.client.builds.list(this.resourceGroup, this.registry.name);
            }
        }
        if (removeOld) { this.clearLogItems() }
        this.nextLink = buildListResult.nextLink;
        this.addLogs(buildListResult);
    }

    public addLogs(logs: Build[]): void {
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
        if (filter.buildTask) { // Build Task id
            parsedFilter = `BuildTaskName eq '${filter.buildTask}'`;
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
    buildId?: string;
    buildTask?: string;
}
