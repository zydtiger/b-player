import React, { useState, useRef, useEffect } from "react";

interface CollapsibleProps {
  /** Title text displayed in the collapsible header */
  title: string;
  /** Duration of expand/collapse animation in milliseconds */
  duration?: number;
  /** Whether the collapsible starts expanded */
  defaultExpanded?: boolean;
  /** Optional callback when expand/collapse state changes */
  onToggle?: (expanded: boolean) => void;
  /** Additional CSS class for the container */
  className?: string;
  /** Child elements to be displayed as collapsible content */
  children: React.ReactNode;
}

/**
 * A collapsible component with smooth animations and accessibility support.
 * Features a clickable header with an animated arrow indicator.
 */
export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  duration = 300,
  defaultExpanded = false,
  onToggle,
  className = "",
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [height, setHeight] = useState<number | "auto">(defaultExpanded ? "auto" : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle expansion state changes with smooth animation
  const toggleExpanded = () => {
    if (contentRef.current) {
      const newExpanded = !expanded;

      // Set start height immediately
      if (expanded) {
        // Collapsing: set current height then animate to 0
        setHeight(contentRef.current.scrollHeight);
        // Force a reflow before starting animation
        requestAnimationFrame(() => {
          setHeight(0);
        });
      } else {
        // Expanding: animate from 0 to content height
        setHeight(contentRef.current.scrollHeight);
      }

      setExpanded(newExpanded);
      onToggle?.(newExpanded);
    }
  };

  // Handle animation completion
  useEffect(() => {
    if (height !== "auto" && expanded && height !== 0) {
      // When expanding animation completes, set height to auto
      const timer = setTimeout(() => {
        setHeight("auto");
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [height, expanded, duration]);

  // Update height on window resize when expanded
  useEffect(() => {
    if (expanded && height === "auto") {
      const handleResize = () => {
        if (contentRef.current) {
          setHeight(contentRef.current.scrollHeight);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [expanded, height]);

  return (
    <div className={`collapsible max-w-screen box-border ${className}`}>
      {/* Header with title and arrow */}
      <button
        type="button"
        className="collapsible-header group w-full flex items-center justify-between py-2 px-4 text-left text-base font-medium bg-neutral-900 border border-transparent rounded-lg cursor-pointer transition-colors duration-250 hover:border-blue-500 dark:hover:border-indigo-500"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls="collapsible-content"
      >
        <h3 className="text-lg font-medium text-white dark:text-gray-100">{title}</h3>

        {/* Arrow indicator */}
        <div
          className="transform transition-transform duration-300 ease-in-out text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
          style={{
            transform: expanded ? "rotate(0deg)" : "rotate(90deg)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>

      {/* Collapsible content */}
      <div
        id="collapsible-content"
        className="overflow-hidden"
        style={{
          height: height,
          transition: `height ${duration}ms ease-in-out`,
        }}
        aria-hidden={!expanded}
      >
        <div ref={contentRef} className="p-2 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapsible;
