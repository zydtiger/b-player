import React, { useMemo } from "react";
import { MusicPiece } from "@@/shared/model";
import GridView from "../components/GridView";
import ListView from "../components/ListView";
import Collapsible from "../components/Collapsible";

interface GroupedViewProps {
  type: "recently-added" | "recently-played";
  viewMode: "grid" | "list";
  onMusicClick: (music: MusicPiece) => void;
  allMusic: MusicPiece[];
}

interface TimeGroup {
  label: string;
  music: MusicPiece[];
}

/**
 * Grouped view for "Recently Added" and "Recently Played" playlists.
 * Displays music in collapsible sections: Last Week, Last Month, Last Year.
 */
const GroupedView: React.FC<GroupedViewProps> = ({ type, viewMode, onMusicClick, allMusic }) => {
  const groups = useMemo((): TimeGroup[] => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const dateField = type === "recently-added" ? "createdAt" : "lastPlayed";

    // Filter out music without lastPlayed for "recently-played"
    const filteredMusic =
      type === "recently-played" ? allMusic.filter((m) => m.lastPlayed != null) : allMusic;

    console.log(oneWeekAgo);
    console.log(filteredMusic.map((m) => m[dateField]!));

    const lastWeek = filteredMusic.filter((m) => m[dateField]! >= oneWeekAgo);
    const lastMonth = filteredMusic.filter(
      (m) => m[dateField]! >= oneMonthAgo && m[dateField]! < oneWeekAgo,
    );
    const lastYear = filteredMusic.filter(
      (m) => m[dateField]! >= oneYearAgo && m[dateField]! < oneMonthAgo,
    );

    const result: TimeGroup[] = [];
    if (lastWeek.length > 0) result.push({ label: "Last Week", music: lastWeek });
    if (lastMonth.length > 0) result.push({ label: "Last Month", music: lastMonth });
    if (lastYear.length > 0) result.push({ label: "Last Year", music: lastYear });
    return result;
  }, [allMusic, type]);

  if (groups.length === 0) {
    return <div className="p-8 text-center text-gray-500">No music found</div>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Collapsible
          key={group.label}
          title={`${group.label} (${group.music.length})`}
          defaultExpanded={true}
          className="border-none"
        >
          {viewMode === "grid" ? (
            <GridView musicPieces={group.music} onMusicClick={onMusicClick} />
          ) : (
            <ListView musicPieces={group.music} onMusicClick={onMusicClick} />
          )}
        </Collapsible>
      ))}
    </div>
  );
};

export default GroupedView;
