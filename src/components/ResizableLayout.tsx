import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ResizableLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  className?: string;
  hideLeftPanel?: boolean;
  orientation?: 'horizontal' | 'vertical'; // horizontal: left/right, vertical: top/bottom
  storageKeyPrefix?: string; // to avoid collisions when nesting
}

export const ResizableLayout = ({ leftPanel, rightPanel, className, hideLeftPanel = false, orientation = 'horizontal', storageKeyPrefix = 'plantuml' }: ResizableLayoutProps) => {
  // Track primary pane size in pixels to avoid layout shifts on content changes
  const [primarySizePx, setPrimarySizePx] = useState<number>(() => {
    try {
      const key = orientation === 'horizontal' ? `${storageKeyPrefix}-left-width-px` : `${storageKeyPrefix}-top-height-px`;
      const savedPx = localStorage.getItem(key);
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

    const rect = containerRef.current.getBoundingClientRect();
    if (orientation === 'horizontal') {
      const proposed = e.clientX - rect.left;
      const min = rect.width * 0.2;
      const max = rect.width * 0.8;
      const clamped = Math.max(min, Math.min(max, proposed));
      setPrimarySizePx(clamped);
      try { localStorage.setItem(`${storageKeyPrefix}-left-width-px`, JSON.stringify(clamped)); } catch {}
    } else {
      const proposed = e.clientY - rect.top;
      const min = rect.height * 0.2;
      const max = rect.height * 0.8;
      const clamped = Math.max(min, Math.min(max, proposed));
      setPrimarySizePx(clamped);
      try { localStorage.setItem(`${storageKeyPrefix}-top-height-px`, JSON.stringify(clamped)); } catch {}
    }
  }, [isDragging, orientation, storageKeyPrefix]);

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

  // Initialize pixel size on first mount when container size is known
  useEffect(() => {
    if (primarySizePx >= 0) return; // already initialized
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let initialPx = (orientation === 'horizontal' ? rect.width : rect.height) * 0.5;
    // Migrate from old percent if present
    try {
      const savedPercent = localStorage.getItem(`${storageKeyPrefix}-left-width`);
      if (savedPercent && orientation === 'horizontal') {
        initialPx = (JSON.parse(savedPercent) as number) / 100 * rect.width;
      }
    } catch {}
    setPrimarySizePx(initialPx);
    try {
      const key = orientation === 'horizontal' ? `${storageKeyPrefix}-left-width-px` : `${storageKeyPrefix}-top-height-px`;
      localStorage.setItem(key, JSON.stringify(initialPx));
    } catch {}
  }, [primarySizePx, orientation, storageKeyPrefix]);

  // When orientation changes, load previously saved size for that orientation
  useEffect(() => {
    if (!containerRef.current) return;
    try {
      const key = orientation === 'horizontal' ? `${storageKeyPrefix}-left-width-px` : `${storageKeyPrefix}-top-height-px`;
      const savedPxRaw = localStorage.getItem(key);
      const rect = containerRef.current.getBoundingClientRect();
      const defaultPx = (orientation === 'horizontal' ? rect.width : rect.height) * 0.5;
      const nextPx = savedPxRaw ? Math.max(40, Math.min((orientation === 'horizontal' ? rect.width : rect.height) * 0.8, JSON.parse(savedPxRaw))) : defaultPx;
      setPrimarySizePx(nextPx);
    } catch {
      // ignore
    }
  }, [orientation, storageKeyPrefix]);

  return (
    <div 
      ref={containerRef}
      className={cn(orientation === 'horizontal' ? 'flex' : 'flex flex-col', "h-full w-full overflow-hidden", className)}
    >
      {/* Left Panel */}
      {!hideLeftPanel && leftPanel && (
        <div 
          className={cn("flex-shrink-0 overflow-hidden min-w-0", orientation === 'vertical' && 'min-h-0')}
          style={{ 
            width: orientation === 'horizontal' && primarySizePx >= 0 ? `${primarySizePx}px` : undefined,
            minWidth: orientation === 'horizontal' && primarySizePx >= 0 ? `${primarySizePx}px` : undefined,
            maxWidth: orientation === 'horizontal' && primarySizePx >= 0 ? `${primarySizePx}px` : undefined,
            height: orientation === 'vertical' && primarySizePx >= 0 ? `${primarySizePx}px` : undefined,
            minHeight: orientation === 'vertical' && primarySizePx >= 0 ? `${primarySizePx}px` : undefined,
            maxHeight: orientation === 'vertical' && primarySizePx >= 0 ? `${primarySizePx}px` : undefined,
          }}
        >
          {leftPanel}
        </div>
      )}

      {/* Resize Handle */}
      {!hideLeftPanel && leftPanel && (
        <div
          className={cn(
            orientation === 'horizontal'
              ? "w-1 bg-editor-border hover:bg-[hsl(var(--editor-keyword))] cursor-col-resize flex-shrink-0 transition-colors relative group"
              : "h-1 bg-editor-border hover:bg-[hsl(var(--editor-keyword))] cursor-row-resize flex-shrink-0 transition-colors relative group",
            isDragging && "bg-[hsl(var(--editor-keyword))]"
          )}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator on hover */}
          <div className={cn(
            orientation === 'horizontal' ? "absolute inset-y-0 -left-1 -right-1" : "absolute inset-x-0 -top-1 -bottom-1",
            "group-hover:bg-[hsla(var(--editor-keyword),0.2)] transition-colors"
          )} />
        </div>
      )}

      {/* Right Panel */}
      <div 
        className={cn("overflow-hidden", orientation === 'horizontal' ? 'min-w-0' : 'min-h-0', (hideLeftPanel || !leftPanel) ? "w-full h-full" : "flex-1")}
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