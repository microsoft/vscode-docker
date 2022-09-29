import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('catCodicons.show', () => {
			CVEWebViewPanel.show(context.extensionUri, null, null);
		})
	);
}


export class CVEWebViewPanel {

	public static readonly viewType = 'catCodicons';

	public static show(extensionUri: vscode.Uri, results: any[], imageName: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		const panel = vscode.window.createWebviewPanel(
			CVEWebViewPanel.viewType,
			"CVE Vulnerabilities",
			column || vscode.ViewColumn.One
		);

		panel.webview.html = this._getHtmlForWebview(panel.webview, extensionUri, results, imageName);
	}

	private static _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, results: any[], imageName: string) {
		let resultTable = `<table class="table table-dark">
		<thead>
		<tr>
		<th scope="col">URL</th>
		<th scope="col">CVE Description</th>
		<th scope="col">Source</th>
		<th scope="col">Source Id</th>
		<th scope="col">Vulnerable Range</th>
	  </tr>
	  </thead><tbody>`;

		const values = results.map(result => {
			// debugger; // eslint-disable-line no-debugger
			return `<tr>
			<td>${result?.purl}</td>
			<td>${result?.nist_cve?.description}</td>
			<td>${result?.source}</td>
			<td>${result?.source_id}</td>
			<td>${result?.vulnerable_range}</td>
			</tr>
			`;
		}).join(" ");
		resultTable += values;
		resultTable += "</tbody></table>";
		// Get resource paths
		// const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styles.css'));
		// debugger; // eslint-disable-line no-debugger
		// const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-iYQeCzEYFbKjA/T2uDLTpkwGzCiq6soy8tYaI1GyVh/UjpbCx/TYkiZhlZB6+fzT" crossorigin="anonymous">
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.1/dist/js/bootstrap.bundle.min.js" integrity="sha384-u1OknCvxWvY5kfmNBILK2hRnQC3Pr17a+RTT6rIHI7NnikvbZlHgTPOOmMi466C8" crossorigin="anonymous"></script>
				<title>Scan Results</title>
			</head>
			<body class="bg-dark">
				<div class="container bg-dark">
					<h1 style="color:white;">${imageName}</h1>
					<div id="icons">
						${resultTable}
					</div>
				</div>
			</body>
			</html>`;
	}
}
