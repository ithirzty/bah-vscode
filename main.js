const vscode = require('vscode');
const fs = require("fs");
const cproc = require("child_process");

LanguageClient = require("vscode-languageclient").LanguageClient;
TransportKind = require("vscode-languageclient").TransportKind;

let client;

vscode.window.showQuickPick();

//Checking for update
cproc.execSync("git fetch",{cwd: __dirname})
headHash = new TextDecoder().decode(cproc.execSync("git rev-parse HEAD",{cwd: __dirname}))
upstreamHash = new TextDecoder().decode(cproc.execSync("git rev-parse main@{upstream}",{cwd: __dirname}))

if (headHash != upstreamHash) {
  cproc.execSync("git pull origin main",{cwd: __dirname})
  cproc.execSync("rm main",{cwd: __dirname+"/bahls"})
  vscode.window.showInformationMessage("A new version of the Bah extension is available. Restart vscode to apply changes.")
}


let serverOptions = {
  command: __dirname+'/bahls/main'
};

if (!fs.existsSync(serverOptions.command)) {
  stdout = cproc.execSync('bah main.bah -o main', {
    cwd: __dirname+'/bahls'
  })
  vscode.window.showInformationMessage("Compiled a new version of the Bah language server.")
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