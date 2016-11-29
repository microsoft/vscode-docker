import vscode = require('vscode');
import * as cp from 'child_process';
//var dc: vscode.DiagnosticCollection;


export function doValidate(e:vscode.TextDocumentChangeEvent) {
    var dc: vscode.DiagnosticCollection = this;

    let source = 'docker linter';
    //let range = new vscode.Range(e.document.positionAt(0), e.document.positionAt(5));
    //let d = new vscode.Diagnostic(range, 'this is a fake error', vscode.DiagnosticSeverity.Warning);
    let diagnostics: vscode.Diagnostic[] = [];
    dc.clear;
    //diagnostics.push(d);
    
    switch (e.document.languageId) {
        case 'dockerfile':
            let p = cp.exec('dockerlint ' + e.document.fileName);
            p.stderr.on('data', (data: string) => { 
                console.log('stderr: ' + data);
                
                var res:string[] = data.split(' ');
                var lineNumber:number = Number(res[res.length -1]);
                var sev: vscode.DiagnosticSeverity = vscode.DiagnosticSeverity.Warning;
                if (res[0] === 'ERROR:') {
                    sev = vscode.DiagnosticSeverity.Error;
                }
                let r: vscode.Range = new vscode.Range(lineNumber -1, 0, lineNumber -1, 1000);
                let d: vscode.Diagnostic = new vscode.Diagnostic(r, data, sev);
                diagnostics.push(d);
                console.log('diagnostics length on error: ' + diagnostics.length)
                // blah on line XXXX

            });
            p.stdout.on('data', (data:string) => {
                //console.log('stdout: ' + data);

            });
            p.on('exit', (code, signal) => {
                console.log('code: ' + code);
                console.log('signal: ' + signal);
                console.log('diagnostics length on exit: ' + diagnostics.length);
                //diagnostics.pop();
                dc.set(e.document.uri, diagnostics);
                
            }) ;

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