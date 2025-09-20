import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ResizableLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  className?: string;
  hideLeftPanel?: boolean;
}

export const ResizableLayout = ({ leftPanel, rightPanel, className, hideLeftPanel = false }: ResizableLayoutProps) => {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('plantuml-left-width');
    return saved ? JSON.parse(saved) : 50;
  }); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Constrain between 20% and 80%
    const clampedWidth = Math.max(20, Math.min(80, newLeftWidth));
    setLeftWidth(clampedWidth);
    localStorage.setItem('plantuml-left-width', JSON.stringify(clampedWidth));
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
            width: `${leftWidth}%`,
            minWidth: `${leftWidth}%`,
            maxWidth: `${leftWidth}%`
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
        className="overflow-hidden min-w-0"
        style={{ 
          width: hideLeftPanel || !leftPanel ? '100%' : `${100 - leftWidth}%`,
          minWidth: hideLeftPanel || !leftPanel ? '100%' : `${100 - leftWidth}%`,
          maxWidth: hideLeftPanel || !leftPanel ? '100%' : `${100 - leftWidth}%`,
          flexShrink: 0,
          flexGrow: 0
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
};