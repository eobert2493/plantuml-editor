import { Button } from "@/components/ui/button";
import { Eye, Zap, RefreshCw } from "lucide-react";
import { ViewModeToggle } from "./ViewModeToggle";
import { DownloadMenu } from "./DownloadMenu";
import { FileNameOverlay } from "./FileNameOverlay";

interface DiagramViewerHeaderProps {
  needsRefresh: boolean;
  isLoading: boolean;
  viewMode: 'full' | 'sections' | 'stacked';
  hasSections: boolean;
  fileName: string | null;
  onSetViewMode: (mode: 'full' | 'sections' | 'stacked') => void;
  onRefresh: () => void;
  onRenameFile?: (newName: string) => Promise<void> | void;
  onDownloadCurrent: (format: 'svg' | 'png') => void;
  onDownloadAllSections: (format: 'svg' | 'png') => void;
  onDownloadStackedSvg: () => void;
  onDownloadStackedPdf: () => void;
}

export const DiagramViewerHeader = ({
  needsRefresh,
  isLoading,
  viewMode,
  hasSections,
  fileName,
  onSetViewMode,
  onRefresh,
  onRenameFile,
  onDownloadCurrent,
  onDownloadAllSections,
  onDownloadStackedSvg,
  onDownloadStackedPdf,
}: DiagramViewerHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-editor-border relative">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-editor-keyword" />
        <h3 className="text-sm font-medium text-editor-text">Diagram Preview</h3>
        {needsRefresh && !isLoading && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <Zap className="w-3 h-3" />
            <span>Press Cmd+J to refresh</span>
          </div>
        )}
        {isLoading && (
          <div className="w-3 h-3 border border-editor-keyword border-t-transparent rounded-full animate-spin" />
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <ViewModeToggle
          viewMode={viewMode}
          hasSections={hasSections}
          onSetViewMode={onSetViewMode}
        />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="hidden sm:inline-flex h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        
        <DownloadMenu
          isLoading={isLoading}
          hasSections={hasSections}
          onDownloadCurrent={onDownloadCurrent}
          onDownloadAllSections={onDownloadAllSections}
          onDownloadStackedSvg={onDownloadStackedSvg}
          onDownloadStackedPdf={onDownloadStackedPdf}
        />
      </div>

      <FileNameOverlay fileName={fileName} onRenameFile={onRenameFile} />
    </div>
  );
};

