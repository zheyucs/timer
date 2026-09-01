const { app, BrowserWindow, Menu, globalShortcut } = require("electron");

if (require("electron-squirrel-startup")) {
    app.quit();
}
path = require("path");
let win;
const createWindow = () => {
    win = new BrowserWindow({
        icon: path.join(__dirname, "icon.png"),
        width: 800,
        height: 600,
        minWidth: 500,
        minHeight: 600,
        center: true, // center on screen (overrides x/y)
        resizable: true,
        fullscreenable: true, // allows the window to go fullscreen
    });

    win.loadFile("index.html");
};
Menu.setApplicationMenu(null);

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    const registered = globalShortcut.register("F11", () => {
        win.setFullScreen(!win.isFullScreen());
    });

    if (!registered) {
        console.log("F11 registration failed!");
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
