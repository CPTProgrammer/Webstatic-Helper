const {contextBridge, ipcRenderer} = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    getIndividualSettings: function (){
        return ipcRenderer.sendSync("GET_INDIVIDUAL_SETTINGS");
    }
});
