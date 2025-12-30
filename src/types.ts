/**
 * System playlist types for internal use
 */
interface SystemPlaylist {
  id: string;
  name: string;
  icon: string;
}

export const SYSTEM_PLAYLISTS: SystemPlaylist[] = [
  { id: "library", name: "Library", icon: "📚" },
  { id: "recently-added", name: "Recently Added", icon: "🕐" },
  { id: "recently-played", name: "Recently Played", icon: "🕒" },
];
