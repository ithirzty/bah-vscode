const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
    exec
} = require("child_process");
// const { CompletionItemKind } = require("vscode-languageserver-types");
createConnection = require("vscode-languageserver").createConnection;
TextDocuments = require("vscode-languageserver").TextDocuments;
ProposedFeatures = require("vscode-languageserver").ProposedFeatures;
DidChangeConfigurationNotification = require("vscode-languageserver").DidChangeConfigurationNotification;
CompletionItemKind = require("vscode-languageserver").CompletionItemKind;
TextDocumentSyncKind = require("vscode-languageserver").TextDocumentSyncKind;

Diagnostic = require("vscode-languageserver").Diagnostic;
DiagnosticSeverity = require("vscode-languageserver").DiagnosticSeverity;

TextDocument = require('vscode-languageserver-textdocument').TextDocument;
// import {
//     createConnection,
//     TextDocuments,
//     Diagnostic,
//     DiagnosticSeverity,
//     ProposedFeatures,
//     InitializeParams,
//     DidChangeConfigurationNotification,
//     CompletionItem,
//     CompletionItemKind,
//     TextDocumentPositionParams,
//     TextDocumentSyncKind,
//     InitializeResult
//   } from 'vscode-languageserver';



let connection = createConnection(ProposedFeatures.all);
let documents = new TextDocuments(TextDocument);

var funcs = []
var structs = []
var vars = []
var types = []
var mainFile = null

connection.onInitialize((params) => {
    let capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: true
            }
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            // console.log(_event)
        });
    }
});

isCompilling = false

documents.onDidSave(async change => {
    if (isCompilling == true) {
        return
    }
    var name
    if (mainFile != null) {
        name = mainFile
    } else {
        name = change.document._uri
        name = name.substring(7)
    }
    isCompilling = true

    started = new Date().getTime()
    console.log("\n%c[Checking]%c '" + name + "'...", "color: green", "color: unset")

    exec("bah " + name + " -debug", (error, stdout, stderr) => {


        if (error == null) {
            console.log("Done checking '" + name + "'.", (new Date().getTime() - started) + "ms")
        } else {
            console.log("error checking '" + name + "'.")
        }

        nvars = []
        nfuncs = []
        nstructs = []
        diagnostics = []

        events = JSON.parse(stdout)
        if (!events) {
            console.log("hmmmm")
            return
        }
        events.forEach((e, i) => {

            switch (e.name) {

                case "var_declaration":
                    v = {
                        name: e.element.name,
                        type: e.element.type,
                        range: {
                            from: e.path,
                            to: e.path
                        }
                    }

                    for (j = i + 1; j < events.length; j++) {
                        ie = events[j]
                        if (ie.name == "var_end" && ie.element.name == e.element.name) {
                            v.range.to = ie.path
                        }
                    }
                    nvars.push(v)
                    break

                case "fn_declare":
                    if (e.element.name == "main") {
                        mainFile = name
                    }
                    nfuncs.push({
                        name: e.element.name,
                        type: e.element.returns,
                        args: e.element.args,
                        from: e.path
                    })
                    break

                case "struct_declare":

                    nstructs.push({
                        name: e.element.name,
                        members: e.element.membs,
                        path: e.path
                    })
                    break

                case "error":

                    diagnostics.push({
                        severity: DiagnosticSeverity.Error,
                        range: {
                            start: {
                                line: parseInt(e.path.split(":")[1]) - 1,
                                character: e.range[0] - 1
                            },
                            end: {
                                line: parseInt(e.path.split(":")[1]) - 1,
                                character: e.range[1] - 1
                            }
                        },
                        message: e.element,
                        source: 'bah'
                    })



                    break

                case "warning":

                    diagnostics.push({
                        severity: DiagnosticSeverity.Warning,
                        range: {
                            start: {
                                line: parseInt(e.path.split(":")[1]) - 1,
                                character: e.range[0]
                            },
                            end: {
                                line: parseInt(e.path.split(":")[1]) - 1,
                                character: e.range[1]
                            }
                        },
                        message: e.element,
                        source: 'bah'
                    })
                    break

                case "notice":

                    diagnostics.push({
                        severity: DiagnosticSeverity.Information,
                        range: {
                            start: {
                                line: parseInt(e.path.split(":")[1]) - 1,
                                character: e.range[0]
                            },
                            end: {
                                line: parseInt(e.path.split(":")[1]) - 1,
                                character: e.range[1]
                            }
                        },
                        message: e.element,
                        source: 'bah'
                    })
                    break

            }



        })
        vars = nvars
        funcs = nfuncs
        structs = nstructs
        connection.sendDiagnostics({
            uri: change.document._uri,
            diagnostics
        })
        isCompilling = false
    })
})


function getVarsInRage(pos) {
    r = []
    vpath = pos.textDocument.uri.substring(7)
    vars.forEach(v => {
        vp = v.range.from.split(":")[0]
        if (vp == vpath) {
            vfrom = parseInt(v.range.from.split(":")[1])
            vto = parseInt(v.range.to.split(":")[1])

            if (pos.position.line + 1 >= vfrom && pos.position.line + 1 <= vto) {
                r.push(v)
            }

        }

    })

    return r
}


connection.onCompletion(
    (_textDocumentPosition) => {
        // The pass parameter contains the position of the text document in
        // which code complete got requested. For the example we ignore this
        // info and always provide the same completion items.
        //   {
        //     label: 'TypeScript',
        //     kind: CompletionItemKind.Text,
        //     data: 1
        //   }

        r = [];
        vpath = _textDocumentPosition.textDocument.uri.substring(7)

        funcs.forEach(fn => {
            fnfrom = parseInt(v.range.from.split(":")[1])
            fnpath = parseInt(v.range.from.split(":")[0])
            if (fnpath == vpath && _textDocumentPosition.position.line + 1 < fnfrom) {
                return
            }
            r.push({
                label: fn.name,
                kind: CompletionItemKind.Function
            });
        });

        structs.forEach(s => {
            r.push({
                label: s.name,
                kind: CompletionItemKind.Struct
            });
        });

        vars.forEach(v => {
            vp = v.range.from.split(":")[0]
            if (vp == vpath) {
                vfrom = parseInt(v.range.from.split(":")[1])
                vto = parseInt(v.range.to.split(":")[1])

                if (_textDocumentPosition.position.line + 1 >= vfrom && _textDocumentPosition.position.line + 1 <= vto) {
                    r.push({
                        label: v.name,
                        kind: CompletionItemKind.Variable
                    });

                    structs.forEach(s => {
                        if (s.name == v.type.replace(/\*/, "")) {
                            s.members.forEach(m => {
                                r.push({
                                    label: v.name + "." + m.name,
                                    kind: CompletionItemKind.Field
                                });
                            })
                        }
                    })

                }

            }

        })

        types.forEach(t => {
            r.push({
                label: t.name,
                kind: CompletionItemKind.Type
            });
        });

        return r;
    }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(item => {
    if (item.kind == CompletionItemKind.Function) {
        funcs.forEach(fn => {
            if (fn.name == item.label) {
                item.detail = fn.type
                item.label += "()"
                args = ""
                fn.args.forEach(a => {
                    args += " " + a.name + " " + a.type + ","
                })
                args = args.substring(1, args.length - 1)
                if (fn.type == undefined) {
                    fn.type = ""
                }
                item.documentation = fn.name + "(" + args + ")" + fn.type + "\n\n" + fn.from
            }
        });
    } else if (item.kind == CompletionItemKind.Struct) {
        structs.forEach(s => {
            if (s.Name == item.label) {
                item.detail = ""
                item.documentation = ""
            }
        });
    } else if (item.kind == CompletionItemKind.Variable) {
        vars.forEach(v => {
            if (v.name == item.label) {
                item.detail = v.type
            }
            item.documentation = v.from
        });
    }
    return item;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();