# Project Documentation

> **IMPORTANT:** This file contains long-term architectural knowledge. When making meaningful architectural changes, update both this file and README.md to keep documentation in sync.

## Architecture Overview

B-Player is an Electron application with a clear frontend/backend separation:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Electron Process                        │
├─────────────────────────────────┬───────────────────────────────┤
│   Main Process (Backend)        │   Renderer Process (Frontend) │
│   electron/                     │   src/                        │
├─────────────────────────────────┼───────────────────────────────┤
│ • IPC Handlers (handler.ts)     │ • React Components            │
│ • Database (db.ts)              │ • Redux Store (store/)        │
│ • Services (Music/Playlist)     │ • RTK Query (apiSlice.ts)     │
│ • File System I/O               │ • UI Rendering                │
│ • yt-dlp Integration            │ • User Interactions           │
└─────────────────────────────────┴───────────────────────────────┘
      IPC Communication (ipcBaseQuery + Context Bridge)
```

## Backend Architecture (`electron/`)

### Technology Stack
- **better-sqlite3** - Synchronous SQLite for data persistence
- **ytdlp-nodejs** - Music downloading from web sources
- **@ffprobe-installer/ffprobe** - Metadata extraction (duration, file size)
- **Zod** - Runtime type validation for all data

### Database Schema

**Music Pieces Table:**
```sql
CREATE TABLE music_pieces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  hash TEXT UNIQUE NOT NULL,        -- SHA1 of source URL for deduplication
  srcLink TEXT NOT NULL,
  author TEXT NOT NULL,
  authorLink TEXT NOT NULL,
  duration REAL NOT NULL,           -- In seconds
  fileSize INTEGER NOT NULL,        -- In bytes
  playCount INTEGER DEFAULT 0,
  lastPlayed DATETIME
)
```

**Playlists Table:**
```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  isPinned INTEGER DEFAULT 0,       -- 0 or 1
  songCount INTEGER DEFAULT 0,      -- Denormalized for performance
  totalDuration INTEGER DEFAULT 0   -- Denormalized for performance
)
```

**Junction Table (Many-to-Many):**
```sql
CREATE TABLE playlist_music (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlistId INTEGER NOT NULL,
  musicId INTEGER NOT NULL,
  position INTEGER NOT NULL,        -- Order within playlist
  addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (musicId) REFERENCES music_pieces(id) ON DELETE CASCADE,
  UNIQUE(playlistId, position)
)
```

**Key Design Decisions:**
- **Denormalization**: `songCount` and `totalDuration` stored on playlists to avoid expensive joins
- **Automatic Timestamps**: SQLite triggers update `updatedAt` on any row modification
- **Cascade Deletes**: Deleting a music piece removes all junction records automatically
- **Position-Based Ordering**: Explicit `position` field allows custom ordering

### File Storage Pattern

**Hash-Based Directory Structure:**
```
userData/music_storage/
└── <sha1_hash_of_url>/
    ├── audio.{ext}      # Downloaded audio file (original extension)
    └── thumbnail.{ext}  # Cover art (extension from source)
```

**Benefits:**
- Automatic deduplication (same URL = same directory)
- Safe deletion (delete entire directory by hash)
- File integrity verification via hash

### IPC Communication

**Context Bridge (`electron/preload.ts`):**
```typescript
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke(...args) { /* safe wrapper */ },
  on(...args) { /* safe wrapper */ },
  off(...args) { /* safe wrapper */ },
  send(...args) { /* safe wrapper */ }
});
```

**IPC Handlers (`electron/handler.ts`):**
All backend operations exposed via `ipcMain.handle()`:

| Channel | Purpose | Returns |
|---------|---------|---------|
| `getAllMusicPieces` | Fetch all music | `MusicPiece[]` |
| `getAllPlaylists` | Fetch all playlists | `Playlist[]` |
| `getPlaylistWithMusic` | Fetch playlist with tracks | `PlaylistWithMusic` |
| `importMusic` | Import single track | `MusicPiece` |
| `importPlaylist` | Import entire playlist | `Playlist` |
| `deleteMusicPiece` | Delete track from library | `void` |
| `deletePlaylist` | Delete playlist | `void` |
| `removeMusicFromPlaylist` | Remove track from playlist | `void` |
| `updatePlaylist` | Update playlist metadata | `Playlist` |
| `updateLastPlayed` | Track playback stats | `void` |
| `getMusicDir` | Get file path for hash | `string` |
| `openInExplorer` | Open system file browser | `void` |

**Progress Updates:**
During imports, backend sends progress via `event.sender.send('import-progress', progress)`:
```typescript
interface DownloadProgress {
  stage: 'scraping' | 'downloading' | 'metadata' | 'complete';
  current?: number;
  total?: number;
  message: string;
}
```

### Service Layer

**MusicService (`electron/db.ts`):**
- `createMusicPiece()` - Insert with Zod validation
- `getMusicPieceById()` - Fetch by ID
- `getMusicPieceByHash()` - Fetch by hash (for dedup check)
- `getAllMusicPieces()` - Fetch all
- `updateLastPlayed()` - Increment play count, update timestamp
- `deleteMusicPiece()` - Delete from DB, update playlists, remove files

**PlaylistService (`electron/db.ts`):**
- `createPlaylist()` - Insert with Zod validation
- `getPlaylistById()` - Fetch by ID
- `getPlaylistByName()` - Fetch by name (for system playlists)
- `getAllPlaylists()` - Fetch all
- `getPlaylistWithMusic()` - Fetch with tracks, ordered by position
- `insertMusicToPlaylist()` - Add track at position, shift others
- `removeMusicFromPlaylist()` - Remove track, reorder remaining
- `updatePlaylist()` - Update name/description
- `deletePlaylist()` - Delete playlist and junctions

### Import Pipeline

**Music Import Flow:**
1. User pastes URL → Frontend calls `importMusic`
2. Scrape metadata (title, author, thumbnail) using hidden BrowserWindow
3. Calculate SHA1 hash of URL
4. Check if exists by hash (skip if already in library)
5. Download audio via yt-dlp to hash-based directory
6. Extract duration/size via FFprobe
7. Download thumbnail
8. Create database record
9. Send progress updates throughout

**Playlist Import Flow:**
1. Scrape playlist metadata and all track URLs
2. Create playlist record
3. For each track: import (skip existing), add to junction table
4. Update denormalized `songCount` and `totalDuration`

## Frontend Architecture (`src/`)

### Technology Stack
- **React 18** - Functional components with hooks
- **Redux Toolkit** - Global state management
- **RTK Query** - Server state (IPC calls) with caching
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety

### State Management

**Redux Store Structure:**
```typescript
{
  api: {
    // RTK Query managed state
    queries: { /* query results */ },
    mutations: { /* mutation results */ },
    provided: { /* cache tags */ },
    subscriptions: { /* active subscriptions */ }
  },
  musicPlayer: {
    queue: MusicPiece[],           // Current playback queue
    currentIndex: number,          // Currently playing track (-1 if none)
    queueSourcePlaylist: string,   // Origin of current queue
    isPlaying: boolean,
    activePlaylist: string,        // Currently selected in sidebar
    viewMode: "grid" | "list",
    isLoading: boolean,
    loadingMessage?: string,
    loadingProgress: number        // 0-100 during import
  }
}
```

**State Update Pattern:**
All state updates go through Redux actions — never mutate state directly.

### RTK Query Integration

**Custom Base Query (`src/store/slices/apiSlice.ts:8-15`):**
```typescript
const ipcBaseQuery = async (args: { channel: string; args?: unknown[] }) => {
  try {
    const result = await window.ipcRenderer.invoke(args.channel, ...(args.args || []));
    return { data: result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
};
```

**Tag-Based Cache Invalidation:**
- `MusicPiece` - Invalidated on import/delete
- `Playlist` - Invalidated on playlist CRUD
- `PlaylistWithMusic` - Invalidated per-playlist on mutations

### Component Architecture

**Layout Hierarchy:**
```
App
├── TopBar (header with collapse toggle)
├── SideBar (navigation)
│   ├── System playlists (Library, Recently Added, Recently Played)
│   └── User playlists (pinned only)
├── Main Content Area
│   ├── BasicView (for Library and user playlists)
│   └── GroupedView (for Recently Added/Played with time grouping)
└── PlayBar (fixed bottom player controls)
```

**View Switching Logic:**
No external routing — views switch based on `activePlaylist` state:
- `Library` → `BasicView` with all music
- `Recently Added` → `GroupedView` grouped by `addedAt`
- `Recently Played` → `GroupedView` grouped by `lastPlayedAt`
- User playlist → `BasicView` with playlist contents

**Data Derivation Pattern:**
`App` component derives playlist content from RTK Query data:
```typescript
const allMusic = useGetAllMusicPiecesQuery();
const allPlaylists = useGetAllPlaylistsQuery();

// Derive content based on activePlaylist
const currentMusic = useMemo(() => {
  if (activePlaylist === "Library") return allMusic.data;
  if (activePlaylist === "Recently Added") { /* group by addedAt */ }
  // ... etc
}, [activePlaylist, allMusic.data]);
```

### Component Patterns

**Container/Presentational Separation:**
- **Smart components** (App, views) — handle data fetching, state
- **Dumb components** (GridView, ListView) — pure UI rendering

**Context Menus:**
- `MusicOptions` — Right-click on tracks (delete, remove from playlist, open in explorer)
- `PlaylistOptions` — Right-click on playlists (rename, delete)

**View Mode Toggle:**
`viewMode` state switches between `GridView` and `ListView` components.

## Communication Style

**Closing Signature:** When completing tasks or finishing interactions, the model MUST end its response with "喵～" (Meow~) in Chinese. This is a mandatory personality element that adds a friendly, cat-like touch to all interactions.

## Styling

### Comment Styles

#### JSDoc (`/** */`)
- **Functions**: One-line description, `@param`, `@returns`, `@throws`
- **Interfaces**: Brief purpose, property descriptions with `/** */`
- Keep concise, follow exact variable names in descriptions

```typescript
/**
 * Downloads audio from URL using yt-dlp to hash-based directory.
 *
 * @param url The video/audio URL to download from
 * @param hash Unique identifier for directory name
 * @throws Error if download process fails
 */
```

#### Inline (`//`)
- Implementation explanations within function bodies
- Comment the "why" not the "what"
- Keep short, explain complex logic or edge cases

```typescript
// Construct hash-based directory path
const destDir = path.join(storagePath, hash);
```

#### Disabled Code
- Single-line for commented imports/code
- Use `//` not `/* */`

```typescript
// import ffprobe from "@ffprobe-installer/ffprobe";
```

## Design Principles

### KISS (Keep It Simple, Stupid)
- Prefer straightforward solutions over clever abstractions
- Avoid premature optimization
- Use built-in features before libraries

### DRY (Don't Repeat Yourself)
- Extract reusable logic into hooks and utilities
- Share common UI patterns via component composition
- Use RTK Query to avoid duplicate data fetching logic

### SOLID
- **Single Responsibility**: Each component/service has one job
- **Open/Closed**: Design for extension (new playlists) not modification
- **Liskov Substitution**: Substitutable components (GridView ↔ ListView)
- **Interface Segregation**: Focused, minimal IPC handlers
- **Dependency Inversion**: Depend on IPC abstraction, not concrete implementations

## Common Patterns

### Adding a New IPC Handler

1. **Backend** (`electron/handler.ts`):
```typescript
ipcMain.handle("newOperation", (_event, param: Type): ReturnType => {
  const service = new Service(databaseManager.getDatabase());
  return service.newOperation(param);
});
```

2. **Frontend** (`src/store/slices/apiSlice.ts`):
```typescript
newOperation: builder.mutation<ReturnType, ParamType>({
  query: (param) => ({ channel: "newOperation", args: [param] }),
  invalidatesTags: ["RelevantTag"],
}),
```

3. **Component**:
```typescript
const [newOperation] = useNewOperationMutation();
await newOperation(param).unwrap();
```

### Adding a New System Playlist

1. **Update data filtering** in `App.tsx`
2. **Add sidebar entry** to `SideBar.tsx` system playlists list
3. **Define grouping logic** if time-based (use `GroupedView`)

### Database Schema Migration

Current approach uses `CREATE TABLE IF NOT EXISTS`. For migrations:
1. Add version tracking table
2. Write migration functions
3. Run migrations on app startup before initializing services

## Documentation Maintenance

**When to update this file:**
- Adding new IPC handlers or patterns
- Changing database schema
- Introducing new component patterns
- Architectural refactoring

**When to update README.md:**
- New user-facing features
- Technology stack changes
- Build/dev workflow changes
- Installation or setup changes

**Rule:** If the change affects long-term code structure or how future developers will work with the codebase, update CLAUDE.md. If it affects how users understand or use the app, update README.md. For significant changes, update both.
