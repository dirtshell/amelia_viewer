const path = require('path')
const url = require('url')
const nodeConsole = require('console')
const settings = require('electron-settings');
const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require("fs");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let myConsole = new nodeConsole.Console(process.stdout, process.stderr);

// ============================================================================
// Start a liveserver that hosts all of our assets so Aframe works
// ============================================================================
const liveServer = require("live-server")
let myPath = path.resolve(__dirname, '.');
const liveServerParams = {
    port: 8181, // Set the server port. Defaults to 8080.
    host: "127.0.0.1", // Set the address to bind to. Defaults to 0.0.0.0 or process.env.IP.
    root: myPath, // Set root directory that's being served. Defaults to cwd.
    open: false, // When false, it won't load your browser by default.
    ignore: 'scss,my/templates', // comma-separated string for paths to ignore
    file: "index.html", // When set, serve this file (server root relative) for every 404 (useful for single-page applications)
    wait: 1000, // Waits for all changes, before reloading. Defaults to 0 sec.
    mount: [['/components', './node_modules']], // Mount a directory to a route.
    logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
    middleware: [function(req, res, next) { next(); }] // Takes an array of Connect-compatible middleware that are injected into the server middleware stack
};
liveServer.start(liveServerParams);


// ============================================================================
// Setup a reverse proxy to avoid CORS issues
// ============================================================================
// Listen on a specific host via the HOST environment variable
var host = process.env.HOST || '127.0.0.1';
// Listen on a specific port via the PORT environment variable
var port = process.env.PORT || 8080;

var cors_proxy = require('cors-anywhere');
cors_proxy.createServer({
    originWhitelist: [], // Allow all origins
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, function() {
    console.log('Running CORS Anywhere on ' + host + ':' + port);
});

// ============================================================================
// Electron code
// ============================================================================
/*
 * Creates the browser window process
 */
function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({ width: 1080, height: 900 })

  // Run as a single instance app
  makeSingleInstance()

  // if we ever go back to electron based UI uncomment below
  /* and load the index.html of the app.
  win.loadURL(url.format({
    pathname: "localhost:8181",
    protocol: 'http:',
    slashes: true
  }))*/
  win.loadFile('empty_index.html')

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', ()=> {
    // Load the application settings
    try {
        var settingsFileContent = fs.readFileSync(
            path.join(__dirname, 'settings.json'))
        console.log("Loaded the following settings from 'settings.json': \n" + 
        settingsFileContent)
        settings.setAll(JSON.parse(settingsFileContent)) 
    } catch(err) {
        console.log("Failed to parse 'settings.json': " + err)
        app.quit() // TODO: use default values and print error in app
    }

    // Create the main window
    createWindow()
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Be sure to save the settings on closing the application
app.on('quit', () => {
    console.log("Saving settings to 'settings.json'")
    var settingsString = JSON.stringify(settings.getAll(), null, 4)
    fs.writeFileSync(path.join(__dirname, 'settings.json'), settingsString)
});

// Make this a single instance application, so you don't open another instance
// when you try to launch the application while it is already running
function makeSingleInstance () {
  if (process.mas) return

  app.requestSingleInstanceLock()

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}


//=============================================================================
// Require all the other main processes
//=============================================================================
// Load the application menus
require(path.join(__dirname, 'main_process/application_menu.js'))
