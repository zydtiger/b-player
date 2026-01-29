import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import {
  setIsPlaying,
  playNext,
  playPrev,
  setPlaybackMode,
  jumpToIndex,
  type PlaybackMode,
} from "./store/slices/musicPlayer";
import type { MusicPiece } from "@@/shared/model";

interface PlayBarProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

interface QueueHoverPanelProps {
  queue: MusicPiece[];
  currentIndex: number;
  playbackMode: PlaybackMode;
  shuffleBuffer: number[];
  shuffleIndex: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Derives the playback order based on current playback mode.
 * Returns array of indices showing upcoming tracks in order.
 */
const getPlaybackOrder = (
  queue: MusicPiece[],
  currentIndex: number,
  playbackMode: PlaybackMode,
  shuffleBuffer: number[],
  shuffleIndex: number,
): number[] => {
  if (queue.length === 0) return [];

  const order: number[] = [];

  switch (playbackMode) {
    case "loop-single":
      // Show current track repeating
      order.push(currentIndex);
      break;

    case "shuffle":
      // Current track first, then remaining shuffle buffer
      order.push(currentIndex);
      order.push(...shuffleBuffer.slice(shuffleIndex));
      break;

    case "sequential":
    default:
      // Current track, then rest of queue in order
      for (let i = 0; i < queue.length; i++) {
        order.push((currentIndex + i) % queue.length);
      }
      break;
  }

  return order;
};

const QueueHoverPanel: React.FC<QueueHoverPanelProps> = ({
  queue,
  currentIndex,
  playbackMode,
  shuffleBuffer,
  shuffleIndex,
  onMouseEnter,
  onMouseLeave,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });

  const handleJumpToTrack = (originalIndex: number) => {
    dispatch(jumpToIndex(originalIndex));
    dispatch(setIsPlaying(true));
  };

  // Calculate position based on actual panel height
  const updatePosition = useCallback(() => {
    if (!panelRef.current) return;

    const panelWidth = 400;
    const padding = 8;
    const panelMargin = 8; // Fixed gap above PlayBar
    const playBarHeight = 80; // From PlayBar className
    const actualPanelHeight = panelRef.current.offsetHeight;

    // Calculate Y position: panel bottom should be panelMargin above PlayBar top
    let y = window.innerHeight - playBarHeight - panelMargin - actualPanelHeight;

    // Ensure panel stays within viewport (with padding)
    y = Math.max(padding, y);

    setPanelPosition({
      x: Math.max(padding, window.innerWidth - panelWidth - padding),
      y,
    });
  }, []);

  // Update position after panel renders with actual content
  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, queue.length, playbackMode]);

  const playbackOrder = getPlaybackOrder(
    queue,
    currentIndex,
    playbackMode,
    shuffleBuffer,
    shuffleIndex,
  );
  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{
        left: `${panelPosition.x}px`,
        top: `${panelPosition.y}px`,
        width: "400px",
        maxHeight: "400px",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">
          Queue ({playbackOrder.length} track{playbackOrder.length !== 1 ? "s" : ""})
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Mode:{" "}
          {playbackMode === "sequential"
            ? "Sequential"
            : playbackMode === "loop-single"
              ? "Loop Single"
              : "Shuffle"}
        </p>
      </div>

      {/* Track List */}
      <div className="max-h-80 overflow-y-auto">
        {playbackOrder.map((queueIndex, displayIndex) => {
          const track = queue[queueIndex];
          const isCurrent = queueIndex === currentIndex;
          return (
            <button
              key={queueIndex}
              onClick={() => handleJumpToTrack(queueIndex)}
              className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                isCurrent
                  ? "bg-blue-50 dark:bg-indigo-900/20 text-blue-700 dark:text-indigo-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
              }`}
            >
              {/* Position indicator */}
              <span
                className={`w-5 text-sm font-medium ${isCurrent ? "text-blue-600 dark:text-indigo-400" : "text-gray-400"}`}
              >
                {isCurrent ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="animate-pulse"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ) : (
                  displayIndex + 1
                )}
              </span>

              {/* Thumbnail */}
              <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 shrink-0 overflow-hidden">
                <img
                  src={`thumbnail://${track.hash}`}
                  alt={track.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium truncate ${isCurrent ? "text-blue-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}
                >
                  {track.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {track.author}
                </div>
              </div>

              {/* Duration */}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatTime(track.duration)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PlayBar: React.FC<PlayBarProps> = ({ audioRef, volume, onVolumeChange }) => {
  const dispatch = useAppDispatch();
  const { queue, currentIndex, isPlaying, playbackMode, shuffleBuffer, shuffleIndex } =
    useAppSelector((state) => state.musicPlayer);
  const currentMusic = queue[currentIndex];
  const audioReadyRef = useRef(false);

  // Calculate playback order for queue badge count
  const playbackOrder = useMemo(
    () => getPlaybackOrder(queue, currentIndex, playbackMode, shuffleBuffer, shuffleIndex),
    [queue, currentIndex, playbackMode, shuffleBuffer, shuffleIndex],
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const queueButtonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [volumeBeforeMute, setVolumeBeforeMute] = useState<number>(volume);

  // Clear any pending timeout when component unmounts
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Show queue immediately on hover
  const handleQueueMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsQueueOpen(true);
  }, []);

  // Hide queue with delay when mouse leaves (allows smooth transition to panel)
  const handleQueueMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsQueueOpen(false);
    }, 150); // 150ms delay to prevent flickering
  }, []);

  // Reset audio ready state when track changes
  useEffect(() => {
    audioReadyRef.current = false;
    setCurrentTime(0);
    setDuration(currentMusic?.duration ?? 0);
  }, [currentMusic]);

  // Handle audio playback
  useEffect(() => {
    const audioElem = audioRef.current;
    if (!audioElem) return;

    if (isPlaying && audioReadyRef.current && audioElem.paused) {
      audioElem.play().catch((e) => {
        console.error("Error playing audio:", e);
        dispatch(setIsPlaying(false));
      });
    } else if (!isPlaying && !audioElem.paused) {
      audioElem.pause();
    }
  }, [isPlaying, dispatch, audioRef]);

  // Update volumeBeforeMute when volume changes externally
  useEffect(() => {
    if (volume > 0) {
      setVolumeBeforeMute(volume);
    }
  }, [volume]);

  // Handle volume change (now managed by parent component)
  // Volume state is lifted to App.tsx for global keyboard control

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const handleTogglePlay = () => {
    dispatch(setIsPlaying(!isPlaying));
  };

  const handleCyclePlaybackMode = () => {
    const modes: PlaybackMode[] = ["sequential", "loop-single", "shuffle"];
    const currentModeIndex = modes.indexOf(playbackMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    dispatch(setPlaybackMode(nextMode));
  };

  const handlePlayNext = () => {
    dispatch(playNext());
  };

  const handlePlayPrev = () => {
    dispatch(playPrev());
  };

  const handlePlay = () => {
    window.ipcRenderer.invoke("updateLastPlayed", currentMusic.hash).catch((e) => {
      console.error("Error updating lastPlayed:", e);
    });
  };

  const handleVolumeToggle = useCallback(() => {
    if (volume === 0) {
      // Unmute: restore previous volume (default to 0.5 if none stored)
      const restoredVolume = volumeBeforeMute > 0 ? volumeBeforeMute : 0.5;
      onVolumeChange(restoredVolume);
    } else {
      // Mute: store current volume and set to 0
      setVolumeBeforeMute(volume);
      onVolumeChange(0);
    }
  }, [volume, volumeBeforeMute, onVolumeChange]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!currentMusic || currentIndex < 0) {
    return (
      <div className="fixed bottom-0 left-0 w-full h-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500">
        No music selected
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 w-full h-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-40">
      <audio
        ref={audioRef}
        src={`audio://${currentMusic.hash}`}
        loop={playbackMode === "loop-single"}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handlePlayNext}
        onCanPlay={() => {
          audioReadyRef.current = true;
          if (isPlaying) {
            audioRef.current?.play().catch((e) => {
              console.error("Error playing audio:", e);
            });
          }
        }}
        onPlay={handlePlay}
      />

      {/* Left: Music Info */}
      <div className="flex items-center w-1/4 min-w-50">
        <div className="w-12 h-12 rounded overflow-hidden mr-3 bg-gray-200 dark:bg-gray-700 shrink-0">
          <img
            src={`thumbnail://${currentMusic.hash}`}
            alt={currentMusic.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTA5MDkwIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik05IDE4VjVsMTIgLTJ2MTMiIC8+PHBhdGggZD0iTTYgMTVIMTlhMyAzIDAgMCAxIDMgM3YzYTMgMyAwIDAgMSAtMyAzSDlhMyAzIDAgMCAxIC0zIC0zeiIgLz48L3N2Zz4=";
            }}
          />
        </div>
        <div className="overflow-hidden">
          <div
            className="font-medium text-gray-900 dark:text-white truncate"
            title={currentMusic.name}
          >
            {currentMusic.name}
          </div>
          <div
            className="text-sm text-gray-500 dark:text-gray-400 truncate"
            title={currentMusic.author}
          >
            {currentMusic.author}
          </div>
        </div>
      </div>

      {/* Center: Controls & Time */}
      <div className="flex flex-col items-center flex-1 max-w-2xl px-4">
        <div className="flex items-center gap-6 mb-1">
          <button
            onClick={handlePlayPrev}
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-indigo-400 focus:outline-none"
            aria-label="Previous"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
              <line x1="5" y1="19" x2="5" y2="5"></line>
            </svg>
          </button>

          <button
            onClick={handleTogglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white focus:outline-none transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-1"
              >
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            )}
          </button>

          <button
            onClick={handlePlayNext}
            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-indigo-400 focus:outline-none"
            aria-label="Next"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19"></line>
            </svg>
          </button>
        </div>

        <div className="w-full flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="w-10 text-right">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:bg-blue-700 dark:[&::-webkit-slider-thumb]:bg-indigo-500 dark:[&::-webkit-slider-thumb]:hover:bg-indigo-600"
          />
          <span className="w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume */}
      <div className="flex items-center justify-end w-1/4 min-w-37.5 gap-2">
        {/* Playback Mode Button */}
        <button
          onClick={handleCyclePlaybackMode}
          className="relative p-1.5 rounded transition-colors text-blue-600 dark:text-indigo-400 bg-blue-100 dark:bg-indigo-900/30 hover:bg-blue-200 dark:hover:bg-indigo-900/50"
          aria-label={`Current mode: ${playbackMode}. Click to cycle.`}
        >
          {playbackMode === "sequential" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m17 2 4 3-4 3" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="m7 22-4-3 4-3" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          )}
          {playbackMode === "loop-single" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m17 2 4 3-4 3" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="m7 22-4-3 4-3" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              <path d="M10.5 15h4h-2V9L10.8 10" />
            </svg>
          )}
          {playbackMode === "shuffle" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6C11 6 11 18 21 18" />
              <path d="M17 14.5l4 3-4 3" />
              <path d="M4 18C11 18 11 6 21 6" />
              <path d="M17 9.5l4-3-4-3" />
            </svg>
          )}
        </button>

        {/* Queue Button */}
        <button
          ref={queueButtonRef}
          onMouseEnter={handleQueueMouseEnter}
          onMouseLeave={handleQueueMouseLeave}
          className="relative p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label="Show queue"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="8" y1="6" x2="22" y2="6" />
            <line x1="8" y1="12" x2="22" y2="12" />
            <line x1="8" y1="18" x2="22" y2="18" />
            <path d="M4 6h.01" />
            <path d="M4 12h.01" />
            <path d="M4 18h.01" />
          </svg>
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 dark:bg-indigo-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
              {playbackOrder.length}
            </span>
          )}
        </button>
        <button
          onClick={handleVolumeToggle}
          className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label={volume === 0 ? "Unmute" : "Mute"}
        >
          {volume === 0 ? (
            // Mute icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          ) : (
            // Normal volume icon
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="min-w-20 max-w-25 h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gray-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:bg-gray-700 dark:[&::-webkit-slider-thumb]:bg-gray-400 dark:[&::-webkit-slider-thumb]:hover:bg-gray-200"
        />
      </div>

      {/* Queue Hover Panel */}
      {isQueueOpen && (
        <QueueHoverPanel
          queue={queue}
          currentIndex={currentIndex}
          playbackMode={playbackMode}
          shuffleBuffer={shuffleBuffer}
          shuffleIndex={shuffleIndex}
          onMouseEnter={handleQueueMouseEnter}
          onMouseLeave={handleQueueMouseLeave}
        />
      )}
    </div>
  );
};

export default PlayBar;
