/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import https = require('https');

export function tagsForImage(image: IHubSearchResponseResult): string {
    var tags: string[] = [];
    if (image.is_automated) {
        tags.push('Automated');
    } else if (image.is_trusted) {
        tags.push('Trusted');
    } else if (image.is_official) {
        tags.push('Official');
    }
    if (tags.length > 0) {
        return '[' + tags.join('] [') + ']';
    }
    return '';
}

export function searchImageInRegistryHub(imageName: string, cache: boolean): Promise<IHubSearchResponseResult> {
    return invokeHubSearch(imageName, 1, cache).then((data) => {
        if (data.results.length === 0) {
            return;
        }
        return data.results[0];
    });
}

var popular = [
    { "is_automated": false, "name": "redis", "is_trusted": false, "is_official": true, "star_count": 1300, "description": "Redis is an open source key-value store that functions as a data structure server." },
    { "is_automated": false, "name": "ubuntu", "is_trusted": false, "is_official": true, "star_count": 2600, "description": "Ubuntu is a Debian-based Linux operating system based on free software." },
    { "is_automated": false, "name": "wordpress", "is_trusted": false, "is_official": true, "star_count": 582, "description": "The WordPress rich content management system can utilize plugins, widgets, and themes." },
    { "is_automated": false, "name": "mysql", "is_trusted": false, "is_official": true, "star_count": 1300, "description": "MySQL is a widely used, open-source relational database management system (RDBMS)." },
    { "is_automated": false, "name": "mongo", "is_trusted": false, "is_official": true, "star_count": 1100, "description": "MongoDB document databases provide high availability and easy scalability." },
    { "is_automated": false, "name": "centos", "is_trusted": false, "is_official": true, "star_count": 1600, "description": "The official build of CentOS." },
    { "is_automated": false, "name": "node", "is_trusted": false, "is_official": true, "star_count": 1200, "description": "Node.js is a JavaScript-based platform for server-side and networking applications." },
    { "is_automated": false, "name": "nginx", "is_trusted": false, "is_official": true, "star_count": 1600, "description": "Official build of Nginx." },
    { "is_automated": false, "name": "postgres", "is_trusted": false, "is_official": true, "star_count": 1200, "description": "The PostgreSQL object-relational database system provides reliability and data integrity." },
    { "is_automated": true, "name": "microsoft/aspnet", "is_trusted": true, "is_official": false, "star_count": 277, "description": "ASP.NET is an open source server-side Web application framework" }
];

export function searchImagesInRegistryHub(prefix: string, cache: boolean): Promise<IHubSearchResponseResult[]> {
    if (prefix.length === 0) {
        // return the popular images if user invoked intellisense 
        // right after typing the keyword and ':' (e.g. 'image:').
        return Promise.resolve(popular.slice(0));
    }

    // Do an image search on Docker hub and return the results 
    return invokeHubSearch(prefix, 100, cache).then((data) => {
        return data.results;
    });
}

// https://registry.hub.docker.com/v1/search?q=redis&n=1
// {
//     "num_pages": 10,
//     "num_results": 10,
//     "results": [
//         {
//             "is_automated": false,
//             "name": "redis",
//             "is_trusted": false,
//             "is_official": true,
//             "star_count": 830,
//             "description": "Redis is an open source key-value store that functions as a data structure server."
//         }
//     ],
//     "page_size": 1,
//     "query": "redis",
//     "page": 1
// }
function invokeHubSearch(imageName: string, count: number, cache: boolean): Promise<IHubSearchResponse> {
    // https://registry.hub.docker.com/v1/search?q=redis&n=1
    return fetchHttpsJson<IHubSearchResponse>({
        hostname: 'registry.hub.docker.com',
        port: 443,
        path: '/v1/search?q=' + encodeURIComponent(imageName) + '&n=' + count,
        method: 'GET',
    }, cache);
}
export interface IHubSearchResponse {
    num_pages: number;
    num_results: number;
    results: [IHubSearchResponseResult];
    page_size: number;
    query: string;
    page: number;
}
export interface IHubSearchResponseResult {
    is_automated: boolean;
    name: string;
    is_trusted: boolean;
    is_official: boolean;
    star_count: number;
    description: string;
}

var JSON_CACHE: any = {};

function fetchHttpsJson<T>(opts: https.RequestOptions, cache: boolean): Promise<T> {
    if (!cache) {
        return doFetchHttpsJson(opts);
    }

    var cache_key = (opts.method + ' ' + opts.hostname + ' ' + opts.path);
    if (!JSON_CACHE[cache_key]) {
        JSON_CACHE[cache_key] = doFetchHttpsJson(opts);
    }

    // new promise to avoid cancelling
    return new Promise<T>((resolve, reject) => {
        JSON_CACHE[cache_key].then(resolve, reject);
    });
}

function doFetchHttpsJson<T>(opts: https.RequestOptions): Promise<T> {
    opts.headers = opts.headers || {};
    opts.headers['Accept'] = 'application/json';
    return httpsRequestAsPromise(opts).then((data) => {
        return JSON.parse(data);
    })
}

function httpsRequestAsPromise(opts: https.RequestOptions): Promise<string> {

    return new Promise<string>((resolve, reject) => {
        var req = https.request(opts, (res) => {
            var data = '';
            res.on('data', (d: string) => {
                data += d;
            })
            res.on('end', () => {
                resolve(data);
            })
        });
        req.end();
        req.on('error', reject);
    });
}