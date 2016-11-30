import vscode = require('vscode');
import * as cp from 'child_process';
import { diagnosticCollection } from '../dockerExtension';
var fs = require('fs');
var DockerFileValidator = require('dockerfile_lint');

function createErrDiagnostic(e, doc: vscode.TextDocument): vscode.Diagnostic {
    var r: vscode.Range;
    var lineNum = -1;

    if (e.line) {
        lineNum = e.line;
    }

    if (lineNum === -1) {
        r = new vscode.Range(0, 0, 0, 1);
    } else {
        r = doc.lineAt(lineNum - 1).range
    }

    let d: vscode.Diagnostic = new vscode.Diagnostic(r, e.message + ': ' + e.lineContent, vscode.DiagnosticSeverity.Error);
    d.source = 'vscode-docker'
    return d;

}

function createWarnDiagnostic(e, doc: vscode.TextDocument): vscode.Diagnostic {

    var r: vscode.Range = new vscode.Range(0, 0, 0, 1);
    var msg: string = e.message; //' + ': ' + e.instruction;

    let d: vscode.Diagnostic = new vscode.Diagnostic(r, msg, vscode.DiagnosticSeverity.Warning);
    d.source = 'vscode-docker'
    return d;

}

export function doValidate(e: vscode.TextDocumentChangeEvent) {


    let diagnostics: vscode.Diagnostic[] = [];

    // if i cut/paste the entire doc i'll get
    // an "extra" call here with getText().length being 0... even 
    // though there is text in the document
    diagnosticCollection.clear();
    if (e.document.getText().length === 0) {
        return;
    }


    switch (e.document.languageId) {
        case 'dockerfile':

            var validator = new DockerFileValidator(__dirname + '/rules/basic_rules.yaml');
            var result = validator.validate(e.document.getText());

            if (result.error.count > 0) {
                for (var i = 0; i < result.error.count; i++) {
                    diagnostics.push(createErrDiagnostic(result.error.data[i], e.document));
                }
            }

            if (result.warn.count > 0) {
                for (var i = 0; i < result.warn.count; i++) {
                    diagnostics.push(createWarnDiagnostic(result.warn.data[i], e.document))
                }
            }

            diagnosticCollection.set(e.document.uri, diagnostics);

            break;

        case 'yaml':
            if (!e.document.fileName.search('/docker-compose*')) {
                return;
            }
            // run docker-compose config

            break;

        default:
            break;
    }



}