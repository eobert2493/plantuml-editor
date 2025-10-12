import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, Grid3X3, Layers } from "lucide-react";

interface ViewModeToggleProps {
  viewMode: 'full' | 'sections' | 'stacked';
  hasSections: boolean;
  onSetViewMode: (mode: 'full' | 'sections' | 'stacked') => void;
}

export const ViewModeToggle = ({ viewMode, hasSections, onSetViewMode }: ViewModeToggleProps) => {
  return (
    <>
      {/* Desktop view mode toggle */}
      <div className="hidden md:flex items-center gap-1 mr-2">
        <Button
          variant={viewMode === 'full' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onSetViewMode('full')}
          className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
          title="Full diagram view"
        >
          <Eye className="w-3 h-3" />
        </Button>
        <Button
          variant={viewMode === 'sections' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onSetViewMode('sections')}
          disabled={!hasSections}
          className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background disabled:opacity-50"
          title="Section navigation view"
        >
          <Grid3X3 className="w-3 h-3" />
        </Button>
        <Button
          variant={viewMode === 'stacked' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onSetViewMode('stacked')}
          disabled={!hasSections}
          className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background disabled:opacity-50"
          title="Stacked sections view"
        >
          <Layers className="w-3 h-3" />
        </Button>
      </div>

      {/* Mobile view mode toggle */}
      <div className="md:hidden mr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
              title="View options"
            >
              <Grid3X3 className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => onSetViewMode('full')}>Full</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetViewMode('sections')} disabled={!hasSections}>Sections</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetViewMode('stacked')} disabled={!hasSections}>Stacked</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
};

