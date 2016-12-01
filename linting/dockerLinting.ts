import vscode = require('vscode');
import { diagnosticCollection } from '../dockerExtension';
var DockerFileValidator = require('dockerfile_lint');

function createErrDiagnostic(e, doc: vscode.TextDocument): vscode.Diagnostic {
    var r: vscode.Range;
    var lineNum = -1;
    var msg = e.message;

    if (e.line) {
        lineNum = e.line;
    }

    if (lineNum === -1) {
        r = new vscode.Range(0, 0, 0, 0);
    } else {
        r = doc.lineAt(lineNum - 1).range
    }

    if (e.lineContent) {
        msg = msg + ': ' + e.lineContent;
    }

    return new vscode.Diagnostic(r, msg, vscode.DiagnosticSeverity.Error);

}

export function scheduleValidate(document: vscode.TextDocument) {
    let urisToValidate: { [uri: string]: boolean; } = {};
    let timeoutToken: NodeJS.Timer = null;

    if (document.languageId !== 'dockerfile') { 
        return;
    }

    urisToValidate[document.uri.toString()] = true;

    if (timeoutToken !== null) {
        clearTimeout(timeoutToken);
    }

    timeoutToken = setTimeout(() => {
        timeoutToken = null;
        vscode.workspace.textDocuments.forEach((document) => {
            if (urisToValidate[document.uri.toString()]) {
                doValidate(document);
            }
        });

        urisToValidate = {};
    }, 200);

    return;
}

function doValidate(document: vscode.TextDocument) {

    let diagnostics: vscode.Diagnostic[] = [];
    let validator = new DockerFileValidator(__dirname + '/rules/basic_rules.yaml');
    let result = validator.validate(document.getText());

    if (result.error.count > 0) {
        for (let i = 0; i < result.error.count; i++) {
            diagnostics.push(createErrDiagnostic(result.error.data[i], document));
        }
    }

    if (result.warn.count > 0) {
        for (let i = 0; i < result.warn.count; i++) {
            diagnostics.push(new vscode.Diagnostic(new vscode.Range(0, 0, 0, 0), result.warn.data[i].message + ': ' + result.warn.data[i].description, vscode.DiagnosticSeverity.Warning));
        }
    }

    diagnosticCollection.set(document.uri, diagnostics);

}
