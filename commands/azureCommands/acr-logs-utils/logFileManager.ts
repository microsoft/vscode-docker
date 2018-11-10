import { BlobService, createBlobServiceWithSas } from 'azure-storage';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';
import { getBlobInfo, getBlobToText, IBlobInfo } from '../../../utils/Azure/acrTools';

export class LogContentProvider implements vscode.TextDocumentContentProvider {
    public static scheme: string = 'purejs';
    private onDidChangeEvent: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();

    constructor() { }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        let parse: { log: string } = <{ log: string }>JSON.parse(uri.query);
        return decodeBase64(parse.log);
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEvent.event;
    }

    public update(uri: vscode.Uri, message: string): void {
        this.onDidChangeEvent.fire(uri);
    }

}

export function decodeBase64(str: string): string {
    return Buffer.from(str, 'base64').toString('ascii');
}

export function encodeBase64(str: string): string {
    return Buffer.from(str, 'ascii').toString('base64');
}

/** Loads log text from remote url using azure blobservices */
export async function accessLog(url: string, title: string, download: boolean): Promise<void> {
    let blobInfo: IBlobInfo = getBlobInfo(url);
    let blob: BlobService = createBlobServiceWithSas(blobInfo.host, blobInfo.sasToken);
    let text1 = await getBlobToText(blobInfo, blob, 0);
    if (download) {
        await downloadLog(text1, title);
    } else {
        openLogInNewWindow(text1, title);
    }
}

function openLogInNewWindow(content: string, title: string): void {
    const scheme = 'purejs';
    let query = JSON.stringify({ 'log': encodeBase64(content) });
    let uri: vscode.Uri = vscode.Uri.parse(`${scheme}://authority/${title}.log?${query}#idk`);
    vscode.workspace.openTextDocument(uri).then((doc) => {
        return vscode.window.showTextDocument(doc, vscode.ViewColumn.Active + 1, true);
    });
}

export async function downloadLog(content: string, title: string): Promise<void> {
    let uri = await vscode.window.showSaveDialog({
        filters: { 'Log': ['.log', '.txt'] },
        defaultUri: vscode.Uri.file(`${title}.log`)
    });
    fse.writeFile(uri.fsPath, content,
        (err) => {
            if (err) { throw err; }
        });
}
