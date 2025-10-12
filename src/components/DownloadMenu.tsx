import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";

interface DownloadMenuProps {
  isLoading: boolean;
  hasSections: boolean;
  onDownloadCurrent: (format: 'svg' | 'png') => void;
  onDownloadAllSections: (format: 'svg' | 'png') => void;
  onDownloadStackedSvg: () => void;
  onDownloadStackedPdf: () => void;
}

export const DownloadMenu = ({
  isLoading,
  hasSections,
  onDownloadCurrent,
  onDownloadAllSections,
  onDownloadStackedSvg,
  onDownloadStackedPdf,
}: DownloadMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
          title="Download options"
          disabled={isLoading}
        >
          <Download className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onDownloadCurrent('svg')}>Download current (SVG)</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownloadCurrent('png')}>Download current (PNG)</DropdownMenuItem>
        {hasSections && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDownloadAllSections('svg')}>Download sections (SVG)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadAllSections('png')}>Download sections (PNG)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDownloadStackedSvg}>Download stacked view (SVG)</DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadStackedPdf}>Download stacked view (PDF)</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

