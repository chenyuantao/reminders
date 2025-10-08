# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Reminders App** - a macOS-style reminders application built with Next.js 14, TypeScript, and Tailwind CSS. It supports both localStorage and local file storage for data persistence, with automatic tag extraction from reminder text.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server  
npm start

# Run linting
npm run lint
```

### Testing Individual Components
Since this project doesn't have automated tests set up, test components manually through the development server:
```bash
# Test file storage functionality
npm run dev
# Navigate to http://localhost:3000 and test file read/write operations

# Test tag extraction
# Create reminders with "#tag" format in titles or notes to verify extraction
```

## Architecture Overview

### Core Architecture Pattern
The app follows a **client-side React architecture** with centralized state management in the main page component:

- **Single Page Application**: All functionality contained in `app/page.tsx`
- **Component-based UI**: Modular React components for different features
- **Dual Storage Strategy**: File-first storage with localStorage fallback
- **Real-time Tag System**: Automatic tag extraction and statistics

### Key Components Structure

**Data Layer:**
- `services/fileStorage.ts` - Handles file operations with browser File System Access API
- `utils/tagExtractor.ts` - Extracts tags from text using regex patterns
- `types/reminder.ts` - TypeScript interfaces for data models

**UI Components:**
- `components/ReminderList.tsx` - Main list view with drag-and-drop sorting
- `components/Sidebar.tsx` - Navigation and file operations
- `components/TagStats.tsx` - Displays tag statistics and completion rates
- `components/FileSelectionModal.tsx` - File picker interface

### Storage Architecture

**Hybrid Storage System:**
1. **File Storage (Primary)**: Uses browser File System Access API for persistent file-based storage
2. **localStorage (Fallback)**: Browser storage when file access is unavailable
3. **Persistent Writable Streams**: Maintains file handles across operations for better performance

**File Storage Flow:**
- Creates persistent writable streams to maintain file access
- Auto-saves changes to selected files
- Falls back gracefully to localStorage on API failures
- Caches file paths for session continuity

### Tag System Architecture

**Automatic Tag Extraction:**
- Regex pattern: `#([^\s]+)` extracts hashtags from titles and notes  
- Real-time extraction during editing
- Deduplication across title and notes fields
- Statistics calculation with completion rates

**Tag Statistics:**
- Cross-week aggregation for progress tracking
- Color-coded progress indicators based on completion rates
- Hover states with detailed completion information

## File Organization Patterns

### Component Organization
```
components/
├── UI Components (ReminderList, Sidebar, TagStats)
├── Modals (FileSelectionModal)  
└── Utilities (ContextMenu, CircularProgress)
```

### Service Layer Pattern
```
services/
└── fileStorage.ts - File operations service with fallback strategy

utils/
└── tagExtractor.ts - Pure functions for tag processing
```

### Type Definitions
```
types/
├── reminder.ts - Core data models
└── global.d.ts - Global type extensions
```

## Data Models

### Core Reminder Interface
```typescript
interface Reminder {
  id: string
  title: string
  notes?: string
  completed: boolean
  dueDate?: string  
  tags?: string[]        // Auto-extracted from title/notes
  createdAt: string
  updatedAt: string
}
```

## Key Features to Understand

### File System Integration
- Uses modern File System Access API when available
- Creates persistent writable streams for performance
- Automatic fallback to traditional download/upload for unsupported browsers
- File path caching for session restoration

### Tag System Features  
- **Auto-extraction**: Tags automatically extracted from `#hashtag` format
- **Cross-component integration**: Tags used in statistics, search, and organization
- **Real-time updates**: Tag statistics update as reminders are modified
- **Progress tracking**: Completion rates calculated across all time periods

### Paste Shortcut Integration
- **Smart paste detection**: Automatically detects when user pastes text outside input fields
- **Auto-reminder creation**: Converts pasted text into new reminder for today
- **Tag extraction**: Automatically extracts hashtags from pasted content
- **Input field awareness**: Ignores paste events when user is actively typing in input fields

### Link Recognition and Display
- **Automatic URL detection**: Identifies URLs, domain names, and web links in reminder text
- **Clickable links**: Converts recognized URLs into clickable links with hover effects
- **Safe link opening**: Opens links in new tabs with security attributes (noopener noreferrer)
- **Visual indicators**: Shows external link icons to distinguish clickable content
- **Smart URL parsing**: Handles various URL formats (http/https, www., domain.com)

### Week-based Navigation
- Weekly view with navigation controls
- Dynamic week title generation (`Y2024M10W2` format)
- Today highlighting with special styling
- Date-specific reminder organization

## Browser Compatibility Notes

### File System Access API
- **Supported**: Chrome 86+, Edge 86+
- **Fallback**: Traditional file download/upload for other browsers  
- **Detection**: Automatic capability detection with graceful degradation

### Key Browser Checks in Code
```javascript
// File System Access API availability
if ('showOpenFilePicker' in window)

// Persistent storage capability  
if (typeof fileHandle.createWritable === 'function')
```

## Development Guidelines

### State Management Pattern
- Centralized state in main page component (`app/page.tsx`)
- Props-based data flow to child components  
- Service layer for data persistence operations

### File Storage Best Practices
- Always provide localStorage fallback for file operations
- Use persistent writable streams for frequent saves
- Implement proper error handling for file access permissions
- Cache file paths for user experience continuity

### Tag Processing Guidelines
- Extract tags during any title/notes update
- Maintain tag arrays on Reminder objects
- Use pure functions in tagExtractor for testability
- Update statistics reactively when data changes

## Chinese Language Support

The application includes Chinese language support:
- Chinese date formatting with `date-fns/locale/zhCN`
- Chinese text in UI components and error messages
- HTML lang attribute set to "zh" in layout