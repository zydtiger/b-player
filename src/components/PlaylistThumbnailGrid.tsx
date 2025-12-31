import React, { useState, useCallback } from "react";

/**
 * Size variant for thumbnail grid display
 */
type ThumbnailSize = "sidebar" | "list" | "grid";

/**
 * Empty playlist icon (music note)
 */
const EmptyPlaylistIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

interface PlaylistThumbnailGridProps {
  /** Array of thumbnail URLs (max 4) */
  thumbnails: string[];
  /** Size variant for different contexts */
  size?: ThumbnailSize;
  /** Whether the grid is shown in collapsed sidebar (deprecated, use size) */
  collapsed?: boolean;
}

/**
 * Grid component displaying up to 4 music thumbnails in a 2x2 layout.
 * Adjusts layout based on thumbnail count:
 * - 0: Empty music note icon
 * - 1: Single centered image
 * - 2: 1x2 grid (side by side)
 * - 3: First row 2 images, second row 1 centered
 * - 4+: Full 2x2 grid
 *
 * Size variants:
 * - sidebar: w-6 h-6 (collapsed) or w-8 h-8 (expanded)
 * - list: w-16 h-16 (64x64px)
 * - grid: w-full h-full (responsive, determined by parent)
 */
const PlaylistThumbnailGrid: React.FC<PlaylistThumbnailGridProps> = React.memo(
  ({ thumbnails, size: sizeProp, collapsed = false }) => {
    const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

    // Determine effective size based on props (backward compatibility)
    const effectiveSize = sizeProp || "sidebar";
    const isGrid = effectiveSize === "grid";

    // Size class mappings for each variant
    const sizeClasses: Record<ThumbnailSize, string> = {
      sidebar: collapsed ? "w-6 h-6" : "w-8 h-8",
      list: "w-16 h-16",
      grid: "w-full h-full",
    };

    const containerSize = sizeClasses[effectiveSize];

    // Handle image load error
    const handleImageError = useCallback((index: number) => {
      setFailedImages((prev) => new Set(prev).add(index));
    }, []);

    // Render placeholder for failed image
    const renderPlaceholder = (index: number) => (
      <div className="bg-gray-200 dark:bg-gray-700 w-full h-full" key={`placeholder-${index}`} />
    );

    // 0 thumbnails - show empty icon
    if (thumbnails.length === 0) {
      return (
        <div className={`flex items-center justify-center ${containerSize}`}>
          <EmptyPlaylistIcon className="text-gray-400 dark:text-gray-600" />
        </div>
      );
    }

    // 1 thumbnail - single centered image
    if (thumbnails.length === 1) {
      const src = thumbnails[0];
      if (failedImages.has(0)) {
        return (
          <div
            className={`flex items-center justify-center ${containerSize} rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800`}
          >
            {renderPlaceholder(0)}
          </div>
        );
      }
      return (
        <div className={`flex items-center justify-center ${containerSize} rounded-md overflow-hidden relative`}>
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => handleImageError(0)}
          />
          {/* Play button overlay for grid size */}
          {isGrid && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-gray-800"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2 thumbnails - 1x2 grid (side by side)
    if (thumbnails.length === 2) {
      return (
        <div className={`${containerSize} rounded-md overflow-hidden grid grid-cols-2 grid-rows-1 relative`}>
          {thumbnails.map((src, index) =>
            failedImages.has(index) ? (
              renderPlaceholder(index)
            ) : (
              <img
                key={index}
                src={src}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => handleImageError(index)}
              />
            ),
          )}
          {/* Play button overlay for grid size */}
          {isGrid && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-gray-800"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 3 thumbnails - 2 in first row, 1 centered in second row
    if (thumbnails.length === 3) {
      return (
        <div className={`${containerSize} rounded-md overflow-hidden grid grid-cols-2 grid-rows-2 relative`}>
          {thumbnails.map((src, index) => {
            // Third item spans both columns and centers
            const colSpanClass = index === 2 ? "col-span-2 flex justify-center" : "";
            return failedImages.has(index) ? (
              <div key={index} className={colSpanClass}>
                {renderPlaceholder(index)}
              </div>
            ) : (
              <div key={index} className={colSpanClass}>
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => handleImageError(index)}
                />
              </div>
            );
          })}
          {/* Play button overlay for grid size */}
          {isGrid && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-gray-800"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 4+ thumbnails - full 2x2 grid (show only first 4)
    const displayThumbnails = thumbnails.slice(0, 4);
    return (
      <div className={`${containerSize} rounded-md overflow-hidden grid grid-cols-2 grid-rows-2 relative`}>
        {displayThumbnails.map((src, index) =>
          failedImages.has(index) ? (
            renderPlaceholder(index)
          ) : (
            <img
              key={index}
              src={src}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => handleImageError(index)}
            />
          ),
        )}
        {/* Play button overlay for grid size */}
        {isGrid && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-gray-800"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  },
);

PlaylistThumbnailGrid.displayName = "PlaylistThumbnailGrid";

export default PlaylistThumbnailGrid;
