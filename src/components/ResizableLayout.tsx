import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ResizableLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  className?: string;
  hideLeftPanel?: boolean;
}

export const ResizableLayout = ({ leftPanel, rightPanel, className, hideLeftPanel = false }: ResizableLayoutProps) => {
  // Track left panel width in pixels to avoid layout shifts on content changes
  const [leftWidthPx, setLeftWidthPx] = useState<number>(() => {
    try {
      const savedPx = localStorage.getItem('plantuml-left-width-px');
      if (savedPx) return JSON.parse(savedPx);
      return -1; // will be initialized after mount
    } catch {
      return -1;
    }
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const proposedPx = e.clientX - containerRect.left;
    // Constrain between 20% and 80% of container width
    const minPx = containerRect.width * 0.2;
    const maxPx = containerRect.width * 0.8;
    const clampedPx = Math.max(minPx, Math.min(maxPx, proposedPx));
    setLeftWidthPx(clampedPx);
    try {
      localStorage.setItem('plantuml-left-width-px', JSON.stringify(clampedPx));
    } catch {}
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse move and mouse up listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Initialize pixel width on first mount when container size is known
  useEffect(() => {
    if (leftWidthPx >= 0) return; // already initialized
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    // Try to migrate from old percent setting if present
    let initialPx = containerRect.width * 0.5;
    try {
      const savedPercent = localStorage.getItem('plantuml-left-width');
      if (savedPercent) {
        initialPx = (JSON.parse(savedPercent) as number) / 100 * containerRect.width;
      }
    } catch {}
    setLeftWidthPx(initialPx);
    try {
      localStorage.setItem('plantuml-left-width-px', JSON.stringify(initialPx));
    } catch {}
  }, [leftWidthPx]);

  return (
    <div 
      ref={containerRef}
      className={cn("flex h-full w-full overflow-hidden", className)}
    >
      {/* Left Panel */}
      {!hideLeftPanel && leftPanel && (
        <div 
          className="flex-shrink-0 overflow-hidden min-w-0"
          style={{ 
            width: leftWidthPx >= 0 ? `${leftWidthPx}px` : undefined,
            minWidth: leftWidthPx >= 0 ? `${leftWidthPx}px` : undefined,
            maxWidth: leftWidthPx >= 0 ? `${leftWidthPx}px` : undefined
          }}
        >
          {leftPanel}
        </div>
      )}

      {/* Resize Handle */}
      {!hideLeftPanel && leftPanel && (
        <div
          className={cn(
            "w-1 bg-editor-border hover:bg-primary cursor-col-resize flex-shrink-0 transition-colors relative group",
            isDragging && "bg-primary"
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator on hover */}
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/20 transition-colors" />
        </div>
      )}

      {/* Right Panel */}
      <div 
        className={cn("overflow-hidden min-w-0", (hideLeftPanel || !leftPanel) ? "w-full" : "flex-1")}
        style={{ 
          flexShrink: 1,
          flexGrow: (hideLeftPanel || !leftPanel) ? 0 : 1
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
};