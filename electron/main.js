const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
let serverProcess;

// --- IPC HANDLERS (Registered Globaly) ---
ipcMain.handle('get-machine-id', async () => {
    try {
        return `${os.hostname()}-${os.userInfo().username}`.toUpperCase();
    } catch (e) {
        return "UNKNOWN-MACHINE-ID";
    }
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const { dialog } = require('electron');
    try {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, options);
        if (canceled) return null;
        return filePath;
    } catch (error) {
        console.error("IPC Save Dialog Error:", error);
        return null;
    }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    const { dialog } = require('electron');
    try {
        const result = await dialog.showOpenDialog(mainWindow, options);
        return result;
    } catch (error) {
        console.error("IPC Open Dialog Error:", error);
        return { canceled: true, filePaths: [] };
    }
});

ipcMain.handle('relaunch-app', async () => {
    app.relaunch();
    app.exit(0);
});

ipcMain.handle('read-excel-file', async () => {
    const { dialog } = require('electron');
    const XLSX = require('xlsx');

    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
        });

        if (canceled || filePaths.length === 0) {
            return { success: false, message: 'Canceled' };
        }

        const filePath = filePaths[0];
        const buffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        return { success: true, data: jsonData, count: jsonData.length };

    } catch (error) {
        console.error("IPC Excel Read Error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('backup-database', async () => {
    const { dialog } = require('electron');
    try {
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.local', 'share'));
        const dbPath = path.join(appData, 'smart-acc-electron-desktop-only', 'smart_acc_v6.db');

        if (!fs.existsSync(dbPath)) throw new Error("Database file NOT found!");

        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'حفظ نسخة احتياطية',
            defaultPath: path.join(os.homedir(), `smart_acc_backup_${new Date().toISOString().split('T')[0]}.db`),
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (canceled || !filePath) return { success: false, cancelled: true };

        const Database = require('better-sqlite3');
        const db = new Database(dbPath);
        db.prepare(`VACUUM INTO ?`).run(filePath);
        db.close();

        return { success: true, filePath };
    } catch (error) {
        console.error("Manual Backup Error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('restore-database', async () => {
    const { dialog } = require('electron');
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'اختر ملف النسخة الاحتياطية للاستعادة',
            properties: ['openFile'],
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (canceled || filePaths.length === 0) return { success: false, cancelled: true };

        const backupPath = filePaths[0];
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.local', 'share'));
        const dbPath = path.join(appData, 'smart-acc-electron-desktop-only', 'smart_acc_v6.db');
        const pendingPath = dbPath + '.pending';

        // Instead of direct overwrite (which might be locked), we copy to .pending
        // The main process will swap them on next restart
        fs.copyFileSync(backupPath, pendingPath);

        return { success: true };
    } catch (error) {
        console.error("Restore Error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('select-directory', async () => {
    const { dialog } = require('electron');
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        if (result.canceled) return null;
        return result.filePaths[0];
    } catch (error) {
        console.error("Select Directory Error:", error);
        return null;
    }
});

// --- AUTO BACKUP STATE ---
let autoBackupConfig = {
    enabled: false,
    times: ["00:00"],
    path: "",
    lastDate: null,
    lastSuccessfulTimes: {},
    emailEnabled: false,
    smtp: { host: "", port: 587, user: "", pass: "", recipient: "" },
    telegramEnabled: false,
    telegram: { token: "", chatId: "" }
};

let isAutoBackupRunning = false;

ipcMain.handle('update-auto-backup', async (event, config) => {
    console.log("📨 [MAIN] Received Update for Auto-Backup:", config);

    // Preserve existing results and sync with DB for the current date
    const currentDate = new Date().toDateString();
    let doneToday = [];
    try {
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.local', 'share'));
        const dbPath = path.join(appData, 'smart-acc-electron-desktop-only', 'smart_acc_v6.db');
        if (fs.existsSync(dbPath)) {
            const Database = require('better-sqlite3');
            const db = new Database(dbPath);
            const row = db.prepare("SELECT last_auto_backup_date, last_auto_backup_times_done FROM tenants WHERE id = 'tenant_default'").get();
            if (row && row.last_auto_backup_date === currentDate) {
                doneToday = row.last_auto_backup_times_done ? JSON.parse(row.last_auto_backup_times_done) : [];
            }
            db.close();
        }
    } catch (e) { console.error("Sync Failed during Update:", e.message); }

    autoBackupConfig = {
        ...autoBackupConfig,
        ...config,
        lastSuccessfulTimes: { ...autoBackupConfig.lastSuccessfulTimes, [currentDate]: doneToday }
    };
    return { success: true };
});

ipcMain.handle('test-email-config', async (event, config) => {
    const nodemailer = require('nodemailer');
    try {
        let transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: { user: config.user, pass: config.pass },
        });
        await transporter.sendMail({
            from: `"Smart Accountant Test" <${config.user}>`,
            to: config.recipient,
            subject: "إشعار اختبار إعدادات النسخ الاحتياطي",
            text: "إذا وصلت هذه الرسالة، فهذا يعني أن إعدادات البريد الإلكتروني في البرنامج تعمل بنجاح.",
        });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('test-telegram-config', async (event, config) => {
    console.log("📨 [MAIN] Testing Telegram Config...");
    try {
        const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.chatId,
                text: "✅ إشعار اختبار: إعدادات تليجرام في برنامج المحاسب الذكي تعمل بنجاح!"
            })
        });
        const result = await response.json();
        if (result.ok) return { success: true };
        return { success: false, error: result.description || "فشل غير معروف" };
    } catch (error) {
        console.error("❌ Telegram Test Failed:", error.message);
        return { success: false, error: error.message };
    }
});

async function sendTelegramDocument(filePath, timeLabel) {
    if (!autoBackupConfig.telegramEnabled || !autoBackupConfig.telegram.token) return;

    const fs = require('fs');
    const { Blob } = require('buffer');

    console.log(`📤 [MAIN] Sending Telegram backup for time: ${timeLabel}...`);

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        const formData = new FormData();
        formData.append('chat_id', autoBackupConfig.telegram.chatId);
        formData.append('document', new Blob([fileBuffer]), fileName);
        formData.append('caption', `📦 نسخة احتياطية مجدولة (${timeLabel})\n📅 التاريخ: ${new Date().toLocaleDateString('ar-EG')}`);

        const response = await fetch(`https://api.telegram.org/bot${autoBackupConfig.telegram.token}/sendDocument`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.ok) {
            console.log("✅ [MAIN] Telegram delivery success.");
        } else {
            console.error("❌ [MAIN] Telegram API error:", result.description);
        }
    } catch (error) {
        console.error("❌ [MAIN] Telegram delivery failed:", error.message);
    }
}

async function sendEmailWithAttachment(filePath, timeLabel) {
    if (!autoBackupConfig.emailEnabled || !autoBackupConfig.smtp.user) return;

    const nodemailer = require('nodemailer');
    try {
        let transporter = nodemailer.createTransport({
            host: autoBackupConfig.smtp.host,
            port: autoBackupConfig.smtp.port,
            secure: autoBackupConfig.smtp.port === 465,
            auth: { user: autoBackupConfig.smtp.user, pass: autoBackupConfig.smtp.pass },
        });

        await transporter.sendMail({
            from: `"Smart Accountant Backup" <${autoBackupConfig.smtp.user}>`,
            to: autoBackupConfig.smtp.recipient,
            subject: `نسخة احتياطية مجدولة (${timeLabel}) - ${new Date().toLocaleDateString('ar-EG')}`,
            text: `مرفق مع هذه الرسالة نسخة احتياطية مجدولة تم إنشاؤها في تمام الساعة ${timeLabel}.`,
            attachments: [{ filename: path.basename(filePath), path: filePath }]
        });
        console.log("✅ [MAIN] Email delivery success.");
    } catch (error) {
        console.error("❌ [MAIN] Email delivery failed:", error);
    }
}

async function executeBackup(timeLabel) {
    if (!autoBackupConfig.enabled) return;

    const now = new Date();
    const currentDate = now.toDateString();

    try {
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.local', 'share'));
        const dbPath = path.join(appData, 'smart-acc-electron-desktop-only', 'smart_acc_v6.db');

        if (!fs.existsSync(dbPath)) return;

        const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
        const backupFileName = `smart_acc_auto_backup_${timestamp}.db`;

        const tempPath = path.join(os.tmpdir(), backupFileName);
        const finalBackupPath = autoBackupConfig.path ? path.join(autoBackupConfig.path, backupFileName) : tempPath;

        const Database = require('better-sqlite3');
        const db = new Database(dbPath);
        db.prepare(`VACUUM INTO ?`).run(finalBackupPath);

        let successfulTimes = [];
        try {
            const row = db.prepare("SELECT last_auto_backup_date, last_auto_backup_times_done FROM tenants WHERE id = 'tenant_default'").get();
            if (row && row.last_auto_backup_date === currentDate) {
                successfulTimes = row.last_auto_backup_times_done ? JSON.parse(row.last_auto_backup_times_done) : [];
            }
            if (!successfulTimes.includes(timeLabel)) successfulTimes.push(timeLabel);

            db.prepare("UPDATE tenants SET last_auto_backup_date = ?, last_auto_backup_times_done = ? WHERE id = 'tenant_default'")
                .run(currentDate, JSON.stringify(successfulTimes));
        } catch (e) { console.error("DB Tracking failed:", e); }
        db.close();

        if (!autoBackupConfig.lastSuccessfulTimes[currentDate]) autoBackupConfig.lastSuccessfulTimes[currentDate] = [];
        if (!autoBackupConfig.lastSuccessfulTimes[currentDate].includes(timeLabel)) {
            autoBackupConfig.lastSuccessfulTimes[currentDate].push(timeLabel);
        }

        console.log(`✅ [MAIN] Local Backup Success [${timeLabel}]`);

        if (autoBackupConfig.emailEnabled) await sendEmailWithAttachment(finalBackupPath, timeLabel);
        if (autoBackupConfig.telegramEnabled) await sendTelegramDocument(finalBackupPath, timeLabel);

        if (!autoBackupConfig.path && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(`❌ [MAIN] Backup Process Error [${timeLabel}]:`, err);
    }
}

function startAutoBackupWatcher() {
    console.log("⏰ [MAIN] Starting Multi-Time Auto-Backup Watcher...");

    setInterval(async () => {
        if (!autoBackupConfig.enabled || isAutoBackupRunning) return;

        isAutoBackupRunning = true;
        try {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const currentDate = now.toDateString();

            for (const scheduledTime of autoBackupConfig.times) {
                const doneToday = autoBackupConfig.lastSuccessfulTimes[currentDate] || [];
                if (doneToday.includes(scheduledTime)) continue;

                const isExactTime = currentTime === scheduledTime;
                const isMissed = currentTime > scheduledTime;

                if (isExactTime || isMissed) {
                    console.log(`🚀 [MAIN] Triggering backup: ${scheduledTime} (${isExactTime ? 'Exact' : 'Missed'})`);
                    await executeBackup(scheduledTime);
                }
            }
        } finally {
            isAutoBackupRunning = false;
        }
    }, 60000);
}
// ----------------------------

function createWindow() {
    const isDev = !app.isPackaged;
    const port = 3016;

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '../public/android-chrome-512x512.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: true,
            backgroundThrottling: false,
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    if (!isDev) {
        mainWindow.setMenuBarVisibility(false);
    }

    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.local', 'share'));
    const defaultAppDataPath = path.join(appData, 'smart-acc-electron-desktop-only');

    // 🔍 HELPER: Find the ACTUAL DB path (similar to db/index.ts logic)
    function resolveActualDbPath() {
        let targetDir = defaultAppDataPath;
        const configPath = path.join(defaultAppDataPath, 'storage_config.json');
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.storagePath) {
                    let potentialPath = config.storagePath;
                    if (fs.existsSync(potentialPath) && fs.lstatSync(potentialPath).isFile()) {
                        potentialPath = path.dirname(potentialPath);
                    }
                    if (fs.existsSync(potentialPath)) targetDir = potentialPath;
                }
            }
        } catch (e) { }
        return path.join(targetDir, 'smart_acc_v6.db');
    }

    const dbPath = resolveActualDbPath();
    const pendingDbPath = dbPath + '.pending';

    if (!fs.existsSync(defaultAppDataPath)) {
        fs.mkdirSync(defaultAppDataPath, { recursive: true });
    }

    // --- ATOMIC SWAP ON STARTUP (Dynamic Location) ---
    if (fs.existsSync(pendingDbPath)) {
        try {
            console.log(`🔄 [MAIN] Pending restore found at ${pendingDbPath}. Swapping...`);
            const walPath = dbPath + '-wal';
            const shmPath = dbPath + '-shm';

            // Delete old files safely
            if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
            if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
            if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

            // Rename pending to main
            fs.renameSync(pendingDbPath, dbPath);
            console.log("✅ [MAIN] Restore swap complete.");
        } catch (e) {
            console.error("❌ [MAIN] Failed to swap pending DB:", e);
        }
    }
    // ----------------------------

    if (isDev) {
        mainWindow.loadURL(`http://localhost:${port}/dashboard/sales`);
    } else {
        const serverPath = path.join(process.resourcesPath, 'app-server/server.js');
        const fallbackServerPath = path.join(app.getAppPath(), '.next/standalone/server.js');

        let finalServerPath = serverPath;
        if (!fs.existsSync(serverPath) && fs.existsSync(fallbackServerPath)) {
            finalServerPath = fallbackServerPath;
        }

        let nodeExecutable = process.execPath;
        const possibleNodePaths = [
            path.join(process.resourcesPath, 'node_portable/node-v20.11.0-win-x64/node.exe'),
            path.join(app.getAppPath(), 'node_portable/node-v20.11.0-win-x64/node.exe'),
        ];

        for (const p of possibleNodePaths) {
            if (fs.existsSync(p)) {
                nodeExecutable = p;
                break;
            }
        }

        if (fs.existsSync(finalServerPath)) {
            // Remove NODE_OPTIONS for packaged apps to avoid "Most NODE_OPTIONs are not supported" error
            const { NODE_OPTIONS, ...cleanEnv } = process.env;

            serverProcess = spawn(nodeExecutable, [finalServerPath], {
                env: {
                    ...cleanEnv,
                    PORT: port,
                    NODE_ENV: 'production',
                    ELECTRON_RUN_AS_NODE: nodeExecutable === process.execPath ? '1' : undefined
                },
                cwd: path.dirname(finalServerPath)
            });

            const forcedLoadTimeout = setTimeout(() => {
                if (mainWindow) mainWindow.loadURL(`http://localhost:${port}/dashboard/sales`);
            }, 10000);

            serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Listening on port') || output.includes('started server')) {
                    clearTimeout(forcedLoadTimeout);
                    if (mainWindow) mainWindow.loadURL(`http://localhost:${port}/dashboard/sales`);
                }
            });

            serverProcess.on('error', (err) => {
                setTimeout(() => {
                    if (mainWindow) mainWindow.loadURL(`http://localhost:${port}/dashboard/sales`);
                }, 5000);
            });
        } else {
            mainWindow.loadURL(`http://localhost:${port}/dashboard/sales`);
        }
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (serverProcess) {
            serverProcess.kill();
        }
    });
}

app.on('ready', () => {
    createWindow();

    // Load initial config from DB on startup
    try {
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.local', 'share'));
        const dbPath = path.join(appData, 'smart-acc-electron-desktop-only', 'smart_acc_v6.db');

        if (fs.existsSync(dbPath)) {
            const Database = require('better-sqlite3');
            const db = new Database(dbPath);
            const row = db.prepare("SELECT * FROM tenants WHERE id = 'tenant_default'").get();
            if (row) {
                autoBackupConfig = {
                    enabled: Boolean(row.auto_backup_enabled),
                    times: JSON.parse(row.auto_backup_times || '["00:00"]'),
                    path: row.auto_backup_path || "",
                    lastDate: row.last_auto_backup_date || null,
                    lastSuccessfulTimes: { [new Date().toDateString()]: JSON.parse(row.last_auto_backup_times_done || "[]") },
                    emailEnabled: Boolean(row.email_backup_enabled),
                    smtp: {
                        host: row.smtp_host || "",
                        port: row.smtp_port || 587,
                        user: row.smtp_user || "",
                        pass: row.smtp_pass || "",
                        recipient: row.backup_recipient_email || ""
                    },
                    telegramEnabled: Boolean(row.telegram_backup_enabled),
                    telegram: {
                        token: row.telegram_bot_token || "",
                        chatId: row.telegram_chat_id || ""
                    }
                };
                console.log("📑 [MAIN] Full Config Loaded (Mail + Telegram)");
            }
            db.close();
        }
    } catch (e) {
        console.error("⚠️ [MAIN] Could not load initial auto-backup config:", e.message);
    }

    startAutoBackupWatcher();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
