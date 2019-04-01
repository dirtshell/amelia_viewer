const path = require('path')
const nodeConsole = require('console')
let myConsole = new nodeConsole.Console(process.stdout, process.stderr);

const {BrowserWindow, Menu, app, shell, dialog} = require('electron')

// Template used for crossplatform compatible system menus
/* for if we ever go back to just electron based
 let template = [{
    label: 'Application',
    submenu: [{
        label: 'Toggle Dev Tools',
        click: (item, focusedWindow) => {
            if(focusedWindow) {
                focusedWindow.toggleDevTools()
            }
        }
    }, {
        label: 'Quit',
        click: () => {
            app.quit()
        }
    }]
}, {
    label: 'Settings',
    click: (item, focusedWindow) => {
        let child = new BrowserWindow({parent: focusedWindow, 
            frame: false, resizable: false, modal: true, show: false})
        child.loadFile('html/settings.html')
        child.once('ready-to-show', () => {
            child.show()
        })
    }
}]*/
let template = [{
    label: 'Application',
    submenu: [{
        label: 'Toggle Dev Tools',
        click: (item, focusedWindow) => {
            if(focusedWindow) {
                focusedWindow.toggleDevTools()
            }
        }
    }, {
        label: 'Quit',
        click: () => {
            app.quit()
        }
    }]
}]

// IDK what this really does
function findReopenMenuItem () {
  const menu = Menu.getApplicationMenu()
  if (!menu) return

  let reopenMenuItem
  menu.items.forEach(item => {
    if (item.submenu) {
      item.submenu.items.forEach(item => {
        if (item.key === 'reopenMenuItem') {
          reopenMenuItem = item
        }
      })
    }
  })
  return reopenMenuItem
}

// On startup create the menu using the template
app.on('ready', () => {
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
})

app.on('browser-window-created', () => {
    let reopenMenuItem = findReopenMenuItem()
    if (reopenMenuItem) reopenMenuitem.enabled = false
})

app.on('window-all-closed', () => {
    let reopenMenuItem = findReopenMenuItem()
    if (reopenMenuItem) reopenMenuItem.enabled = true
})
