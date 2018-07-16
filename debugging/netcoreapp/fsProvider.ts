/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as crypto from 'crypto';
import * as fs from 'fs';

export interface FileSystemProvider {
    dirExists(path: string): Promise<boolean>;
    fileExists(path: string): Promise<boolean>;
    hashFile(path: string): Promise<string>;
    makeDir(path: string): Promise<void>;
    readDir(path: string): Promise<string[]>;
    readFile(filename: string, encoding?: string): Promise<string>;
    unlinkFile(filename: string): Promise<boolean>;
    writeFile(filename: string, data: any): Promise<void>;
}

export class LocalFileSystemProvider implements FileSystemProvider {
    dirExists(path: string): Promise<boolean> {
        return new Promise(
            (resolve, reject) => {
                fs.stat(
                    path,
                    (err, stats) => {
                        if (err) {
                            if (err.code === "ENOENT") {
                                return resolve(false);
                            }

                            return reject(err);
                        }

                        resolve(stats.isDirectory());
                    });
            });
    }

    fileExists(path: string): Promise<boolean> {
        return new Promise(
            (resolve, reject) => {
                fs.stat(
                    path,
                    (err, stats) => {
                        if (err) {
                            if (err.code === "ENOENT") {
                                return resolve(false);
                            }

                            return reject(err);
                        }

                        resolve(stats.isFile());
                    });
            });
    }

    async hashFile(path: string): Promise<string> {
        const hash = crypto.createHash('sha256');

        const contents = await this.readFile(path);

        hash.update(contents);

        return hash.digest('hex');
    }

    makeDir(path: string): Promise<void> {
        return new Promise(
            (resolve, reject) => {
                fs.mkdir(
                    path,
                    err => {
                        if (err) {
                            return reject(err);
                        }

                        resolve();
                    });
            });
    }

    readDir(path: string): Promise<string[]> {
        return new Promise(
            (resolve, reject) => {
                fs.readdir(
                    path,
                    (err: Error, files: string[]) => {
                        if (err) {
                            return reject(err);
                        }

                        return resolve(files);
                    });
            });
    }

    readFile(filename: string, encoding?: string): Promise<string> {
        return new Promise(
            (resolve, reject) => {
                fs.readFile(
                    filename,
                    encoding || 'UTF8',
                    (err: Error, data: string) => {
                        if (err) {
                            return reject(err);
                        }

                        resolve(data);
                    });
            });
    }

    unlinkFile(filename: string): Promise<boolean> {
        return new Promise(
            (resolve, reject) => {
                fs.unlink(
                    filename,
                    err => {
                        if (err) {
                            if (err.code === 'ENOENT') {
                                return resolve(false);
                            }

                            return reject(err);
                        }

                        resolve(true);
                    });
            });
    }

    writeFile(filename: string, data: any): Promise<void> {
        return new Promise(
            (resolve, reject) => {
                fs.writeFile(
                    filename,
                    data,
                    err => {
                        if (err) {
                            return reject(err);
                        }

                        resolve();
                    });
            });
    }
}
