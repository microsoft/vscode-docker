import * as vscode from 'vscode';

export function trimWithElipsis(str: string, max: number = 10): string {
    const elipsis: string = "...";
    const len: number = str.length;

    if (max <= 0 || max >= 100) { return str; }
    if (str.length <= max) { return str; }
    if (max < 3) { return str.substr(0, max); }

    const front: string = str.substr(0, (len / 2) - (-0.5 * (max - len - 3)));
    const back: string = str.substr(len - (len / 2) + (-0.5 * (max - len - 3)));

    return front + elipsis + back;
}

/**
 * Returns a node module installed with VSCode, or null if it fails.
 */
export function getCoreNodeModule(moduleName: string): any {
    try {
        // tslint:disable-next-line:non-literal-require
        return require(`${vscode.env.appRoot}/node_modules.asar/${moduleName}`);
    } catch (err) { }

    try {
        // tslint:disable-next-line:non-literal-require
        return require(`${vscode.env.appRoot}/node_modules/${moduleName}`);
    } catch (err) { }

    return null;
}
