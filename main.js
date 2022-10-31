const vscode = require('vscode');
const fs = require("fs");
const path = require("path");
const cproc = require("child_process");

LanguageClient = require("vscode-languageclient").LanguageClient;
TransportKind = require("vscode-languageclient").TransportKind;

// import {
//   LanguageClient,
//   LanguageClientOptions,
//   ServerOptions,
//   TransportKind
// } from 'vscode-languageclient';

let client;

  vscode.window.showQuickPick();

// vscode.languages.registerHoverProvider('bah', {
//   provideHover(document, position, token) {
//     rg = document.getWordRangeAtPosition(position)
//     if (rg.start.line == rg.end.line) {
    
//   }
// }


//   }
// });



// let serverModule = __dirname+'/lsp/main';
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  // let debugOptions = { execArgv: [''] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions = {
    command: __dirname+'/bahls/main'
    // run: { 
    //   module: serverModule,
    //   transport: TransportKind.ipc 
    // },
    // debug: {
    //   module: serverModule,
    //   transport: TransportKind.ipc,
    //   options: debugOptions
    // }
  };

  console.log(__dirname+'/bahls')
  
  if (!fs.existsSync(serverOptions.command)) {
    console.log("compiling")
    stdout = cproc.execSync('bah main.bah -o main', {
      cwd: __dirname+'/bahls'
    })
    console.log("done: ", stdout)
  } else {
    console.log("already compiled")
  }

  // Options to control the language client
  let clientOptions = {
    // Register the server for plain text documents
    documentSelector: [{ scheme: 'file', language: 'bah' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  //Create the language client and start the client.
  client = new LanguageClient(
    'bahlanguageserver',
    'Bah',
    serverOptions,
    clientOptions
  );

  
  client.onReady().then(()=>{
    console.log("ready!")
  })
  // context.subscriptions.push(client.start())

  // Start the client. This will also launch the server
  client.start();


function deactivate() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}