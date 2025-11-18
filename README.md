# Excel Data Merger PWA

A modern Progressive Web App that merges and visualizes data from multiple Excel files. All data processing happens locally in your browser—no data is sent to any server.

## Features

- **Local Data Processing**: All Excel files are processed entirely in your browser. Your data never leaves your device.
- **Multiple File Support**: Upload and merge data from multiple Excel files simultaneously.
- **Smart Field Merging**: Automatically identifies duplicate fields across files and shows which files contain each field.
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS.
- **CSV Export**: Export merged results as a CSV file for use in other applications.
- **PWA Ready**: Install as a standalone app on your device with offline support.
- **Electron Compatible**: Designed to be wrapped with Electron for desktop deployment.

## How It Works

The application processes Excel files by:

1. Reading the first row (headers) from each uploaded Excel file
2. Identifying unique fields across all files
3. Creating a merged table where each row represents a field and columns show which files contain that field
4. Allowing you to export the results as CSV

### Example

If you have two Excel files:
- **File A** with columns: `Notification`, `Defect Order(s)`, `Results Satisfactory`, `Charger Make`
- **File B** with columns: `Notification`, `Defect Order(s)`, `Results Satisfactory`, `CB1 Function`

The app will create a table showing:
- `Notification` - present in both files (marked with ✓)
- `Defect Order(s)` - present in both files (marked with ✓)
- `Results Satisfactory` - present in both files (marked with ✓)
- `Charger Make` - present only in File A
- `CB1 Function` - present only in File B

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- A modern web browser

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development

Start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use).

### Building

Build for production:

```bash
pnpm build
```

The built files will be in the `dist/` directory.

### Preview

Preview the production build locally:

```bash
pnpm preview
```

## Project Structure

```
excel_data_merger/
├── client/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── FileUploadArea.tsx
│   │   │   └── MergedFieldsTable.tsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   └── useExcelProcessor.ts
│   │   ├── lib/               # Utility functions
│   │   │   ├── excelProcessor.ts
│   │   │   └── excelProcessor.test.ts
│   │   ├── types/             # TypeScript type definitions
│   │   │   └── index.ts
│   │   ├── pages/             # Page components
│   │   │   └── Home.tsx
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # React entry point
│   ├── public/
│   │   ├── manifest.json      # PWA manifest
│   │   └── service-worker.js  # Service worker for offline support
│   └── index.html             # HTML template
├── vitest.config.ts           # Test configuration
├── ELECTRON_SETUP.md          # Guide for Electron integration
└── README.md                  # This file
```

## Testing

Run the unit tests:

```bash
npx vitest run
```

The project includes comprehensive tests for the Excel processing logic, covering:
- Header merging from multiple files
- Case-insensitive field matching
- Duplicate field removal
- CSV export formatting
- Complete workflow integration

## Electron Integration

To wrap this app as a desktop application with Electron, follow the detailed guide in [ELECTRON_SETUP.md](./ELECTRON_SETUP.md).

Quick summary:
1. Install Electron dependencies
2. Create Electron main process and preload script
3. Update package.json with Electron build configuration
4. Run `pnpm electron-dev` for development or `pnpm electron-build` for distribution

## PWA Installation

The app is a Progressive Web App and can be installed on your device:

**On Desktop (Chrome/Edge):**
1. Click the install icon in the address bar
2. Click "Install"

**On Mobile:**
1. Open the app in your browser
2. Tap the menu button
3. Select "Install app" or "Add to Home Screen"

Once installed, the app works offline thanks to the service worker.

## Technology Stack

- **React 19**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS 4**: Styling
- **shadcn/ui**: UI component library
- **XLSX**: Excel file parsing
- **Vitest**: Unit testing
- **Vite**: Build tool and dev server

## Data Privacy

All data processing happens locally in your browser. The application:
- Does not send your Excel files to any server
- Does not store your data anywhere except in your browser's memory
- Does not require an internet connection to function
- Does not use cookies or tracking (analytics are optional and can be disabled)

## Limitations

- Only reads the first row of each Excel file (headers)
- Supports .xlsx and .xls file formats
- Works best with files that have consistent header structures

## Browser Support

The app works on all modern browsers that support:
- ES2020 JavaScript
- Web Workers
- Service Workers (for PWA features)

Tested on:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Files not uploading
- Ensure the files are in .xlsx or .xls format
- Check that the files have headers in the first row
- Try refreshing the page and uploading again

### CSV export not working
- Ensure at least one file has been uploaded
- Check your browser's download settings
- Try a different browser if the issue persists

### PWA installation not available
- Ensure you're using HTTPS (or localhost for development)
- Check that your browser supports PWA installation
- Try accessing the app from a different browser

## Contributing

This is a personal project, but feel free to fork and modify it for your needs.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.

---

**Built with ❤️ for efficient data management**
