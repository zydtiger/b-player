import React from "react";
import { MusicPiece } from "@@/shared/model";
import GridView from "../components/GridView";
import ListView from "../components/ListView";

interface BasicViewProps {
  viewMode: "grid" | "list";
  onMusicClick: (music: MusicPiece) => void;
  musicPieces: MusicPiece[];
}

/**
 * Basic view component for Library and normal playlists.
 * Simple wrapper around GridView and ListView components.
 */
const BasicView: React.FC<BasicViewProps> = ({ viewMode, onMusicClick, musicPieces }) => {
  if (viewMode === "grid") {
    return <GridView musicPieces={musicPieces} onMusicClick={onMusicClick} />;
  }
  return <ListView musicPieces={musicPieces} onMusicClick={onMusicClick} />;
};

export default BasicView;
