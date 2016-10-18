
if(require('electron-squirrel-startup')) return;

const electron = require('electron')
// Module to control application life.
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain
const config = require('electron-json-config');

// CONFIG & IPC 
console.log("start");
console.log("userData path: " + app.getPath('userData'));
console.log("-===========-");
console.log("config file: " + config.file());

console.log(config.all());

ipcMain.on('get_config', (event, name) => {
  console.log("get_config "+name); 
  event.returnValue = config.get(name,""); 
})

ipcMain.on('set_config', (event, name, value) => {
  console.log("set_config "+name+" "+value); 
  config.set(name,value);
  console.log(config.all());
}) 

ipcMain.on('open_config_dialog', (event) => {
  console.log("open_config ");

  let child = new BrowserWindow({parent: mainWindow, modal: true, show: true})
  child.loadURL(`file://${__dirname}/config.html`)
})

ipcMain.on('change_fsmode', (event) => {
  console.log("change_fsmode");
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.on('enable_debug', (event) => {
  mainWindow.webContents.openDevTools()
}); 

ipcMain.on('shutdown', (event) => {
  app.quit();
}); 


function createMainWindow () {
  console.log("createMainWindow");
  mainWindow = new BrowserWindow({width: 800, height: 600, fullscreenable:true, autoHideMenuBar: true})
  

  mainWindow.loadURL(`file://${__dirname}/index.html`)

  //mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })

}

app.on('ready', function() {
   createMainWindow();
})

app.on('window-all-closed', function () {
  console.log("on window-all-closed");
  app.quit();
})


