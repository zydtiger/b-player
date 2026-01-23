import React, { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setIsPlaying, playNext, playPrev } from "./store/slices/musicPlayer";

interface PlayBarProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const PlayBar: React.FC<PlayBarProps> = ({ audioRef, volume, onVolumeChange }) => {
  const dispatch = useAppDispatch();
  const { queue, currentIndex, isPlaying } = useAppSelector((state) => state.musicPlayer);
  const currentMusic = queue[currentIndex];
  const audioReadyRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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
          className="text-gray-500 dark:text-gray-400"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-24 h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gray-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:bg-gray-700 dark:[&::-webkit-slider-thumb]:bg-gray-400 dark:[&::-webkit-slider-thumb]:hover:bg-gray-200"
        />
      </div>
    </div>
  );
};

export default PlayBar;
