# Electron Integration Guide

This Progressive Web App is designed to be easily wrapped with Electron for desktop deployment. Follow these steps to create a desktop application.

## Prerequisites

- Node.js and npm/pnpm installed
- The web app running successfully in the browser

## Step 1: Install Electron Dependencies

```bash
pnpm add -D electron electron-builder
```

## Step 2: Create Electron Main Process

Create a file `electron/main.ts` in the project root:

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.ts'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server port
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

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
```

## Step 3: Create Preload Script

Create `electron/preload.ts`:

```typescript
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  arch: process.arch,
});
```

## Step 4: Update package.json

Add the following to your `package.json`:

```json
{
  "main": "dist/electron/main.js",
  "homepage": "./",
  "scripts": {
    "electron-dev": "concurrently \"pnpm dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron-build": "pnpm build && electron-builder",
    "electron-pack": "electron-builder --dir",
    "electron-dist": "electron-builder"
  },
  "devDependencies": {
    "concurrently": "^8.0.0",
    "electron-is-dev": "^2.0.0",
    "wait-on": "^7.0.0"
  },
  "build": {
    "appId": "com.excel-data-merger.app",
    "productName": "Excel Data Merger",
    "files": [
      "dist/**/*",
      "node_modules/**/*"
    ],
    "directories": {
      "buildResources": "assets"
    },
    "win": {
      "target": [
        "nsis",
        "portable"
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    },
    "mac": {
      "target": [
        "dmg",
        "zip"
      ]
    },
    "linux": {
      "target": [
        "AppImage",
        "deb"
      ]
    }
  }
}
```

## Step 5: Update Vite Configuration

Update `vite.config.ts` to support Electron:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  base: './', // Important for Electron file:// protocol
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

## Step 6: Build and Run

### Development Mode
```bash
pnpm electron-dev
```

### Build for Distribution
```bash
pnpm electron-build
```

## Key Features for Desktop

The application already includes:

- **Local Data Processing**: All Excel file processing happens locally in the browser/Electron process
- **No Network Dependency**: The app works completely offline
- **PWA Capabilities**: Service worker enables offline functionality
- **Modern UI**: Built with React and Tailwind CSS for a native-like experience

## Security Considerations

1. **Context Isolation**: Enabled to prevent XSS attacks
2. **Node Integration**: Disabled for security
3. **Preload Script**: Used to safely expose Electron APIs
4. **Content Security Policy**: Consider adding CSP headers

## Troubleshooting

### Blank Window
- Check that the dev server is running on port 5173
- Verify the `homepage` is set to `"./"` in package.json

### File Paths
- Use `path.join(__dirname, ...)` for reliable path resolution
- Remember that in production, the app loads from `file://` protocol

### Building Issues
- Ensure all dependencies are installed: `pnpm install`
- Clear build cache: `rm -rf dist/`
- Try building the web app first: `pnpm build`

## References

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Security](https://www.electronjs.org/docs/tutorial/security)
- [Electron Builder](https://www.electron.build/)
