/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { FileSystemProvider } from "./fsProvider";

export interface MementoAsync {
    get<T>(name: string, defaultValue?: T): Promise<T | undefined>;
    update<T>(name: string, item: T | undefined): Promise<void>;
}

export interface AppStorageProvider {
    getStorage(appFolder: string): Promise<MementoAsync>;
}

export class DefaultAppStorage implements MementoAsync {
    public constructor(
        private readonly appFolder: string,
        private readonly fileSystemProvider: FileSystemProvider) {
    }

    public async get<T>(name: string, defaultValue?: T): Promise<T | undefined> {
        const itemPath = this.createItemPath(name);

        if (await this.fileSystemProvider.fileExists(itemPath)) {
            const itemData = await this.fileSystemProvider.readFile(itemPath);

            return <T>JSON.parse(itemData);
        }

        return defaultValue;
    }

    public async update<T>(name: string, item: T | undefined): Promise<void> {
        const itemPath = this.createItemPath(name);

        if (item) {
            const itemDir = path.dirname(itemPath);

            await this.fileSystemProvider.ensureDir(itemDir);

            await this.fileSystemProvider.writeFile(itemPath, JSON.stringify(item));
        } else {
            await this.fileSystemProvider.unlinkFile(itemPath);
        }
    }

    private createItemPath(name: string): string {
        return path.join(this.appFolder, 'obj', 'docker', `${name}.json`);
    }
}

export class DefaultAppStorageProvider implements AppStorageProvider {
    public constructor(private readonly fileSystemProvider: FileSystemProvider) {
    }

    public async getStorage(appFolder: string): Promise<MementoAsync> {
        return await Promise.resolve(new DefaultAppStorage(appFolder, this.fileSystemProvider));
    }
}
