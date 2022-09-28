import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('catCodicons.show', () => {
			CatCodiconsPanel.show(context.extensionUri, null);
		})
	);
}


export class CatCodiconsPanel {

	public static readonly viewType = 'catCodicons';

	public static show(extensionUri: vscode.Uri, results: any[]) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		const panel = vscode.window.createWebviewPanel(
			CatCodiconsPanel.viewType,
			"Cat Codicons",
			column || vscode.ViewColumn.One
		);

		panel.webview.html = this._getHtmlForWebview(panel.webview, extensionUri, results);
	}

	private static _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, results: any[]) {
		console.log(results);
		let resultTable = `<table><tr>
		<th>URL</th>
		<th>CVE Description</th>
		<th>Source</th>
		<th>Source Id</th>
		<th>Vulnerable Range</th>
	  </tr>`;

		const values = results.map(result => {
			debugger; // eslint-disable-line no-debugger
			return `<tr>
			<td>${result.purl}</td>
			<td>${result.nist_cve.description}</td>
			<td>${result.source}</td>
			<td>${result.source_id}</td>
			<td>${result.vulnerable_range}</td>
			</tr>
			`;
		});
		resultTable += values;
		resultTable += "</table>";
		// Get resource paths
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styles.css'));
		const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading specific resources in the webview
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; style-src ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Scan Results</title>
				<link href="${styleUri}" rel="stylesheet" />
				<link href="${codiconsUri}" rel="stylesheet" />
			</head>
			<body>
				<h1>codicons</h1>
				<div id="icons">
					${resultTable}
				</div>
			</body>
			</html>`;
	}
}
