# Project Documentation

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