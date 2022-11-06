//代码写的还是挺烂的

const {app, BrowserWindow, protocol, Menu, dialog, ipcMain, shell} = require("electron");
//导入监测鼠标事件的包（不明原因失败） https://www.npmjs.com/package/global-mouse-events
//const mouseEvents = require("iohook");
//导入监测鼠标事件的包 https://github.com/wilix-team/iohook
const ioHook = require("iohook");
//导入文件读取
const fs = require("fs");
const path = require("path");
const url = require("url");
const https = require('https');
//const http = require('http');

const MOUSE_SIDE_BUTTON_CONTROL = 0;
const ALT_CONTROL = 1;

var controlType = ALT_CONTROL;//控制方式

const MAP_MOVING = 0;
const POINTER_MOVING = 1;

var movingType = MAP_MOVING;

var sensitivity = 1;

var mousePosition = {};
var isMouseDown = false;//鼠标是否按下
var isKeyDown = false;
var isFocus = true;

var controlFPS = 60;
var lastFreshTime = 0;

var settingsData = undefined;

var markShortcut = 41;

//总感觉这样写不是很安全
let mainWindow;

//设置文件存储到%AppData%
//const settingsPath = path.join(__dirname, "/settings.json");
const settingsPath = path.join(app.getPath("userData"), "/settings.json");
const defaultSettingsPath = path.join(__dirname, "/default-settings.json");

const createWindow = function (){
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const menuList = [
        {
            label: "工具",
            submenu: [
                {
                    label: "首选项",
                    click() {
                        const settingsWindow = new BrowserWindow({
                            width: 600,
                            height: 400,
                            webPreferences: {
                                nodeIntegration: true,
                                contextIsolation: false
                            }
                        });
                        settingsWindow.setMenuBarVisibility(false);
                        settingsWindow.loadFile("index.html");
                    }
                },
                {
                    label: "退出",
                    role: "quit"
                }
            ]
        },
        {
            label: "视图",
            submenu: [
                {
                    label: "刷新页面",
                    role: "reload"
                },
                {
                    label: "强制刷新页面",
                    role: "forceReload"
                },
                {
                    label: "打开开发者工具",
                    role: "toggleDevTools"
                },
                {
                    type: "separator"
                },
                {
                    label: "重置页面缩放",
                    role: "resetZoom"
                },
                {
                    label: "放大",
                    role: "zoomIn"
                },
                {
                    label: "缩小",
                    role: "zoomOut"
                },
                {
                    type: "separator"
                },
                {
                    label: "全屏",
                    role: "togglefullscreen"
                }
            ]
        },
        {
            label: "窗口",
            submenu: [
                {
                    label: "最小化",
                    role: "minimize"
                },
                {
                    label: "关闭",
                    role: "close"
                }
            ]
        },
        {
            label: "帮助",
            submenu: [
                {
                    label: "教程",
                    click (){
                        dialog.showMessageBox(mainWindow, {
                            type: "info",
                            title: "教程",
                            message: "暂时没做，看米游社帖子吧！",
                            buttons: ["确定"]
                        });
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "关于",
                    click (){
                        const aboutWindow = new BrowserWindow({
                            width: 600,
                            height: 400,
                            webPreferences: {
                                nodeIntegration: true,
                                contextIsolation: false
                            }
                        });
                        aboutWindow.setMenuBarVisibility(false);
                        aboutWindow.loadFile("about.html");
                    }
                }
            ]
        }
    ];

    //加载菜单栏
    const menu = Menu.buildFromTemplate(menuList);
    Menu.setApplicationMenu(menu);

    //console.log(app.getPath("userData"));

    //加载设置
    fs.exists(settingsPath, function (exists){
        if (exists){
            fs.readFile(settingsPath, function (err, data){
                if (err){
                    throw err;
                }
                settingsData = JSON.parse(data.toString());
                console.log("Settings data is read successfully.");
                console.log(settingsData);
            });
        }else {
            fs.readFile(defaultSettingsPath, function (err, data){
                if (err){
                    throw err;
                }
                fs.writeFile(settingsPath, data, function (err){
                    if (err){
                        throw err;
                    }
                    settingsData = JSON.parse(data.toString());
                    console.log(`"settings.json" is not found. File "./settings.json" is created successfully.`);
                });
            });
        }
    });

    //打开开发者工具
    //mainWindow.webContents.openDevTools();

    //隐藏菜单栏
    //mainWindow.setMenuBarVisibility(false);
    //加载大地图页面
    mainWindow.loadURL("https://webstatic.mihoyo.com/ys/app/interactive-map/index.html");

    //拦截并修改渲染Canvas的js文件
    //已更改 819~820行 1261~1262 159~160 2
    //815行，为绘制边框！！
    //908行，控制鼠标点击区域！
    // /http(s)?:\/\/webstatic.mihoyo.com\/ys\/app\/interactive-map\/1_.{20}\.js/
    //已添加到dom-ready事件内，刷新后也可以拦截js，懒得写成函数了，也就是复制粘贴的事
    protocol.interceptBufferProtocol("https", function (request, result){
        //console.log(request);
        //console.log(typeof(request.url))
        if (/http(s)?:\/\/webstatic.mihoyo.com\/ys\/app\/interactive-map\/1_.{20}\.js/.test(request.url)){
            console.warn("Check!");
            try {
                var localJS = fs.readFileSync(path.join(__dirname, "/w1.js"));
                console.log("File w1.js read successfully.");
                console.log(typeof(localJS));
                result(localJS);
            } catch(err){
                console.error(err);
            }
            //result({url: "w1.js"});
            protocol.uninterceptProtocol("https");
        }else {
            //console.warn("else");
            //protocol.uninterceptProtocol("https");
            //request.url = request.url.slice(0, 4) + request.url.slice(5);
            //result(request);
            //result(url.fileURLToPath(request.url));
            //console.log(request);
            let newRequest = request;
            newRequest.hostname = request.url.split("/")[2];
            newRequest.path = request.url.slice(request.url.indexOf("/", 8));
            newRequest.port = (newRequest.port ? newRequest.port : 443);
            //console.log(newRequest);
            let newReq = https.request(newRequest, function (response){
                //console.log(response);
                let bodyBuffer = Buffer.from("");
                response.on("data", function (body){
                    //console.log(body);
                    //result(body);
                    bodyBuffer = Buffer.concat([bodyBuffer, body]);
                });
                response.on("end", function (){
                    //console.log(response);
                    result(bodyBuffer);
                });
            }).end();
            newReq.on("error", function (err){
                console.log("Protocol error!");
                console.error(err);
            });
        }
    });

    //刷新后也可以拦截js
    mainWindow.webContents.on("dom-ready", function (){
        console.log("ready!");
        //防止创建两次拦截事件，经测试经常会发生触发两次dom-ready事件的情况，有知道原因的希望可以联系作者！
        if (protocol.isProtocolIntercepted("https")){
            console.log("Protocol is already intercepted!");
            return;
        }
        protocol.interceptBufferProtocol("https", function (request, result){
            //console.log(request);
            //console.log(typeof(request.url))
            if (/http(s)?:\/\/webstatic.mihoyo.com\/ys\/app\/interactive-map\/1_.{20}\.js/.test(request.url)){
                console.warn("Check!");
                try {
                    var localJS = fs.readFileSync(path.join(__dirname, "/w1.js"));
                    console.log("File w1.js read successfully.");
                    console.log(typeof(localJS));
                    result(localJS);
                } catch(err){
                    console.error(err);
                }
                //result({url: "w1.js"});
                protocol.uninterceptProtocol("https");
            }else {
                //console.warn("else");
                //protocol.uninterceptProtocol("https");
                //request.url = request.url.slice(0, 4) + request.url.slice(5);
                //result(request);
                //result(url.fileURLToPath(request.url));
                //console.log(request);
                let newRequest = request;
                newRequest.hostname = request.url.split("/")[2];
                newRequest.path = request.url.slice(request.url.indexOf("/", 8));
                newRequest.port = (newRequest.port ? newRequest.port : 443);
                //console.log(newRequest);
                let newReq = https.request(newRequest, function (response){
                    //console.log(response);
                    let bodyBuffer = Buffer.from("");
                    response.on("data", function (body){
                        //console.log(body);
                        //result(body);
                        bodyBuffer = Buffer.concat([bodyBuffer, body]);
                    });
                    response.on("end", function (){
                        //console.log(response);
                        result(bodyBuffer);
                    });
                }).end();
                newReq.on("error", function (err){
                    console.log("Protocol error!");
                    console.error(err);
                });
            }
        });
    });


    mainWindow.webContents.on('did-finish-load', function(){

        //注入十字准心，且防止注入两次，目前不明原因会时不时触发两次did-finish-load事件，有知道原因的希望可以联系作者！
        let code = `if (waitForElm == undefined){
                        function waitForElm(selector) {
                            return new Promise(resolve => {
                                if (document.querySelector(selector)) {
                                    return resolve(document.querySelector(selector));
                                }
                                const observer = new MutationObserver(mutations => {
                                    if (document.querySelector(selector)) {
                                        resolve(document.querySelector(selector));
                                        observer.disconnect();
                                    }
                                });
                                observer.observe(document.body, {
                                    childList: true,
                                    subtree: true
                                });
                            });
                        }
                        function htmlToElements(htmlString) {
                            let templateEle = document.createElement("template");
                            templateEle.innerHTML = htmlString;
                            return templateEle.content.childNodes;
                        }
                        waitForElm(".mhy-map-container").then(function(ele) {
                            console.log(ele);
                            document.getElementById("root").appendChild(htmlToElements("<div id=\\"helper-horizontal-line\\" style=\\"z-index: 99999;width: 100%;height: 4px;pointer-events: none;background-color: rgba(255, 255, 255, 0.5);position: absolute;top: 50%;transform: translateY(-50%);\\"></div>")[0]);
                            document.getElementById("root").appendChild(htmlToElements("<div id=\\"helper-vertical-line\\" style=\\"z-index: 99999;height: 100%;width: 4px;pointer-events: none;background-color: rgba(255, 255, 255, 0.5);position: absolute;left: 50%;transform: translateX(-50%);\\"></div>")[0]);
                        });
                    }`;
        mainWindow.webContents.executeJavaScript(code);

        //图标缩放比例
        //mainWindow.webContents.executeJavaScript("window.iconZoom=1;");
    });

    //监听窗口失去焦点
    mainWindow.on("blur", function (){
        //console.log("blur");
        isFocus = false;
    });
    mainWindow.on("focus", function (){
        //console.log("focus");
        isFocus = true;
    });

    //监听使用鼠标侧键控制时的鼠标事件
    ioHook.on("mousedown", function (e){
        //console.log("mousedown");
        if (e.button == 5 && (settingsData ? settingsData.control_type : controlType) == MOUSE_SIDE_BUTTON_CONTROL && !isFocus){
            //模拟点击，关闭当前显示的教程窗口
            mainWindow.webContents.executeJavaScript(`if(document.getElementsByClassName("leaflet-popup-close-button").length>0){document.getElementsByClassName("leaflet-popup-close-button")[0].click();}`);

            //判断两种显示方式（第二种没有任何动作）
            if ((settingsData ? settingsData.moving_type : movingType) == 0){
                //console.log("start");
                //console.log(mainWindow.getContentSize());

                //模拟鼠标按下，作为拖动的开始
                mainWindow.webContents.sendInputEvent({
                    type: "mouseDown",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });
            }

            //记录鼠标在屏幕上的起始位置
            mousePosition.startX = e.x;
            mousePosition.startY = e.y;
            mousePosition.offsetX = mousePosition.offsetY = 0;
            isMouseDown = true;
        }
    });
    ioHook.on("mousedrag", function (e){
        //console.log("mousedrag");
        if (isMouseDown && (settingsData ? settingsData.control_type : controlType) == MOUSE_SIDE_BUTTON_CONTROL && !isFocus){

            mousePosition.offsetX += e.x - mousePosition.startX;
            mousePosition.offsetY += e.y - mousePosition.startY;

            if ((settingsData ? settingsData.moving_type : movingType) == 0 && (Date.now() - lastFreshTime > 1000 / (settingsData ? settingsData.control_fps : controlFPS))){
                //console.log(mousePosition);
                mainWindow.webContents.sendInputEvent({
                    type: "mouseMove",
                    x: mainWindow.getContentSize()[0] / 2 + mousePosition.offsetX * (settingsData ? settingsData.sensitivity : sensitivity),
                    y: mainWindow.getContentSize()[1] / 2 + mousePosition.offsetY * (settingsData ? settingsData.sensitivity : sensitivity)
                });
            }else if ((settingsData ? settingsData.moving_type : movingType) == 1){
                mainWindow.webContents.executeJavaScript(`
                    document.getElementById("helper-horizontal-line").style.transform = "translateY(calc(-50% + ` + mousePosition.offsetY * (settingsData ? settingsData.sensitivity : sensitivity) + `px))";
                    document.getElementById("helper-vertical-line").style.transform = "translateX(calc(-50% + ` + mousePosition.offsetX * (settingsData ? settingsData.sensitivity : sensitivity) + `px))";
                `);
            }
        }
    });
    ioHook.on("mouseup", function (e){
        //console.log("mouseup");
        if (e.button == 5 && (settingsData ? settingsData.control_type : controlType) == MOUSE_SIDE_BUTTON_CONTROL && !isFocus){
            if ((settingsData ? settingsData.moving_type : movingType) == 0){
                //console.log(mainWindow.getContentSize());
                mainWindow.webContents.sendInputEvent({
                    type: "mouseUp",
                    x: mainWindow.getContentSize()[0] / 2 + mousePosition.offsetX * (settingsData ? settingsData.sensitivity : sensitivity),
                    y: mainWindow.getContentSize()[1] / 2 + mousePosition.offsetY * (settingsData ? settingsData.sensitivity : sensitivity),
                    button: "left",
                    clickCount: 1
                });
                mainWindow.webContents.sendInputEvent({
                    type: "mouseDown",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });
                mainWindow.webContents.sendInputEvent({
                    type: "mouseUp",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });
            }else if ((settingsData ? settingsData.moving_type : movingType) == 1){
                moveMap(-mousePosition.offsetX * (settingsData ? settingsData.sensitivity : sensitivity), -mousePosition.offsetY * (settingsData ? settingsData.sensitivity : sensitivity));

                mainWindow.webContents.sendInputEvent({
                    type: "mouseDown",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });
                mainWindow.webContents.sendInputEvent({
                    type: "mouseUp",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });

                mainWindow.webContents.executeJavaScript(`
                    document.getElementById("helper-horizontal-line").style.transform = "translateY(-50%)";
                    document.getElementById("helper-vertical-line").style.transform = "translateX(-50%)";
                `);
            }
            isMouseDown = false;
        }
    });

    //监听使用Alt键控制时的事件 (Alt:keycode=56)
    ioHook.on("keydown", function (e){
        //console.log(settingsData);
        if (e.keycode == 56 && (settingsData ? settingsData.control_type : controlType) == ALT_CONTROL && !isKeyDown && !isFocus){
            mainWindow.webContents.executeJavaScript(`if(document.getElementsByClassName("leaflet-popup-close-button").length>0){document.getElementsByClassName("leaflet-popup-close-button")[0].click();}`);

            if ((settingsData ? settingsData.moving_type : movingType) == 0){
                mainWindow.webContents.sendInputEvent({
                    type: "mouseDown",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });
            }

            mousePosition.startX = mousePosition.x;
            mousePosition.startY = mousePosition.y;
            mousePosition.offsetX = mousePosition.offsetY = 0;
            isKeyDown = true;
        }
    });
    ioHook.on("mousemove", function (e){
        //添加实时位置获取，否则keydown事件无法获取鼠标位置
        mousePosition.x = e.x;
        mousePosition.y = e.y;

        if (isKeyDown && (settingsData ? settingsData.control_type : controlType) == ALT_CONTROL && !isFocus){
            mousePosition.offsetX = e.x - mousePosition.startX;
            mousePosition.offsetY = e.y - mousePosition.startY;

            if ((settingsData ? settingsData.moving_type : movingType) == 0 && (Date.now() - lastFreshTime > 1000 / (settingsData ? settingsData.control_fps : controlFPS))){
                //console.log("mousemove");
                lastFreshTime = Date.now();
                //console.log(mousePosition);
                mainWindow.webContents.sendInputEvent({
                    type: "mouseMove",
                    x: mainWindow.getContentSize()[0] / 2 + mousePosition.offsetX * (settingsData ? settingsData.sensitivity : sensitivity),
                    y: mainWindow.getContentSize()[1] / 2 + mousePosition.offsetY * (settingsData ? settingsData.sensitivity : sensitivity)
                });
            }else if ((settingsData ? settingsData.moving_type : movingType) == 1){
                mainWindow.webContents.executeJavaScript(`
                    document.getElementById("helper-horizontal-line").style.transform = "translateY(calc(-50% + ` + mousePosition.offsetY * (settingsData ? settingsData.sensitivity : sensitivity) + `px))";
                    document.getElementById("helper-vertical-line").style.transform = "translateX(calc(-50% + ` + mousePosition.offsetX * (settingsData ? settingsData.sensitivity : sensitivity) + `px))";
                `);
            }
        }
    });
    ioHook.on("keyup", function (e){
        //console.log(e.keycode);
        if (e.keycode == (settingsData ? settingsData.mark_shortcut : markShortcut)){
            mainWindow.webContents.executeJavaScript(`if(document.getElementsByClassName("map-popup__switch").length>0){document.querySelector(".map-popup__switch").click();}`);
        }
        if (e.keycode == 56 && (settingsData ? settingsData.control_type : controlType) == ALT_CONTROL && !isFocus){
            if ((settingsData ? settingsData.moving_type : movingType) == 0){
                mainWindow.webContents.sendInputEvent({
                    type: "mouseUp",
                    x: mainWindow.getContentSize()[0] / 2 + mousePosition.offsetX * (settingsData ? settingsData.sensitivity : sensitivity),
                    y: mainWindow.getContentSize()[1] / 2 + mousePosition.offsetY * (settingsData ? settingsData.sensitivity : sensitivity),
                    button: "left",
                    clickCount: 1
                });
                mainWindow.webContents.sendInputEvent({
                    type: "mouseDown",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });
                mainWindow.webContents.sendInputEvent({
                    type: "mouseUp",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });
            }else if ((settingsData ? settingsData.moving_type : movingType) == 1){
                moveMap(-mousePosition.offsetX * (settingsData ? settingsData.sensitivity : sensitivity), -mousePosition.offsetY * (settingsData ? settingsData.sensitivity : sensitivity));

                mainWindow.webContents.sendInputEvent({
                    type: "mouseDown",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });
                mainWindow.webContents.sendInputEvent({
                    type: "mouseUp",
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    button: "left",
                    clickCount: 1
                });

                mainWindow.webContents.executeJavaScript(`
                    document.getElementById("helper-horizontal-line").style.transform = "translateY(-50%)";
                    document.getElementById("helper-vertical-line").style.transform = "translateX(-50%)";
                `);
            }
            isKeyDown = false;
        }

    });


    //滚轮放大功能
    ioHook.on("mousewheel", function (e){
        //console.log(e);
        if (!isFocus && (isKeyDown || isMouseDown)){
            if ((settingsData ? settingsData.moving_type : movingType) == 0){
                mainWindow.webContents.sendInputEvent({
                    type: "mouseWheel",
                    deltaX: 0,
                    deltaY: -e.rotation,
                    x: mainWindow.getContentSize()[0] / 2,
                    y: mainWindow.getContentSize()[1] / 2,
                    canScroll: true
                });
            }else if ((settingsData ? settingsData.moving_type : movingType) == 1){
                mainWindow.webContents.sendInputEvent({
                    type: "mouseWheel",
                    deltaX: 0,
                    deltaY: -e.rotation,
                    x: mainWindow.getContentSize()[0] / 2 + mousePosition.offsetX,
                    y: mainWindow.getContentSize()[1] / 2 + mousePosition.offsetY,
                    canScroll: true
                });
            }
        }
    });


    //开始监听
    ioHook.start();


    //移动地图函数
    function moveMap(offsetX, offsetY){
        mainWindow.webContents.sendInputEvent({
            type: "mouseDown",
            x: mainWindow.getContentSize()[0] / 2,
            y: mainWindow.getContentSize()[1] / 2,
            button: "left",
            clickCount: 1
        });
        mainWindow.webContents.sendInputEvent({
            type: "mouseMove",
            x: mainWindow.getContentSize()[0] / 2 + offsetX,
            y: mainWindow.getContentSize()[1] / 2 + offsetY
        });
        mainWindow.webContents.sendInputEvent({
            type: "mouseUp",
            x: mainWindow.getContentSize()[0] / 2 + offsetX,
            y: mainWindow.getContentSize()[1] / 2 + offsetY,
            button: "left",
            clickCount: 1
        });
    }
}

//减少后台性能丢失
app.commandLine.appendSwitch("disable-renderer-backgrounding");

app.on("ready", createWindow);

app.on("window-all-closed", function (){
    app.quit();
});

ipcMain.on("GET_INDIVIDUAL_SETTINGS", function (event){
    if (settingsData){
        event.returnValue = {
            icon_scale: settingsData.icon_scale, //突然发现一个是zoom一个是scale，懒得改了..
            hide_marked: settingsData.hide_marked
        };
    }else {
        //以防万一，还真不知道会不会发生，网速会那么快吗
        fs.readFile(settingsPath, function (err, data){
            if (err){
                throw err;
            }
            event.returnValue = {
                icon_scale: JSON.parse(data.toString()).icon_scale,
                hide_marked: JSON.parse(data.toString()).hide_marked
            };
        });
    }
});

ipcMain.on("GET_SETTINGS", function (event){
    /*console.log(event.sender.id);*/
    /*防止反向注入*/
    if (event.sender.id <= 1){
        event.returnValue = "No permission!";
    }else {
        if (settingsData){
            /*event.returnValue = settingsData;*/
            event.sender.send("GET_SETTINGS_REPLY", settingsData);
        }else {
            fs.readFile(settingsPath, function (err, data){
                if (err){
                    throw err;
                }
                //event.returnValue = JSON.parse(data.toString());
                event.sender.send("GET_SETTINGS_REPLY", JSON.parse(data.toString()));
            });
        }
    }
});

ipcMain.on("SAVE_SETTINGS", function (event, data){
    /*防止反向注入*/
    if (event.sender.id <= 1){
        event.returnValue = "No permission!";
    }else {
        updateData(data);

        //写入文件
        fs.writeFile(settingsPath, Buffer.from(JSON.stringify(data)), function (err){
            if (err){
                event.sender.send("SAVE_SETTINGS_REPLY", "FAILED");
                throw err;
            }
            event.sender.send("SAVE_SETTINGS_REPLY", "SUCCESS");
        });
    }
});

ipcMain.on("RESET_SETTINGS", function (event){
    /*防止反向注入*/
    if (event.sender.id <= 1){
        event.returnValue = "No permission!";
    }else {
        console.log("Reset settings...");
        fs.readFile(defaultSettingsPath, function (err, data){
            if (err){
                event.sender.send("RESET_SETTINGS_REPLY", "FAILED", null);
                throw err;
            }
            fs.writeFile(settingsPath, data, function (err){
                if (err){
                    event.sender.send("RESET_SETTINGS_REPLY", "FAILED", null);
                    throw err;
                }
                updateData(JSON.parse(data.toString()));
                console.log("Reset succeeded.");
                event.sender.send("RESET_SETTINGS_REPLY", "SUCCESS", JSON.parse(data.toString()));
            });
        });
    }
});

ipcMain.on("OPEN_WEBPAGE", function (event, href){
    /*console.log(event.sender.id);*/
    /*防止反向注入*/
    if (event.sender.id <= 1){
        event.returnValue = "No permission!";
    }else {
        shell.openExternal(href);
        console.log("Opened link: " + href);
    }
});

function updateData(data){
    //更新数据
    settingsData = data;
    sensitivity = data.sensitivity;
    movingType = data.moving_type;
    controlType = data.control_type;
    controlFPS = data.control_fps;
    markShortcut = data.mark_shortcut;
    mainWindow.webContents.executeJavaScript("window.hideMarked=" + data.hide_marked + ";");
}
