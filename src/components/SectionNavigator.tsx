import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SectionNavigatorProps {
  sectionName: string;
  currentIndex: number;
  totalSections: number;
  svgHtml: string;
  diagramUrl: string;
  svgContainerRef: React.RefObject<HTMLDivElement>;
  onPrevious: () => void;
  onNext: () => void;
  onError: (message: string) => void;
}

export const SectionNavigator = ({
  sectionName,
  currentIndex,
  totalSections,
  svgHtml,
  diagramUrl,
  svgContainerRef,
  onPrevious,
  onNext,
  onError,
}: SectionNavigatorProps) => {
  return (
    <div className="border border-section-container-border rounded-lg overflow-hidden">
      <div className="bg-section-header-bg px-4 py-3 border-b border-section-container-border flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-section-header-text">
            {sectionName}
          </h4>
          <p className="text-xs text-section-header-text/70">
            Section {currentIndex + 1} of {totalSections}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="h-6 w-6 p-0 text-editor-comment hover:text-editor-text"
            title="Previous section"
          >
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={currentIndex === totalSections - 1}
            className="h-6 w-6 p-0 text-editor-comment hover:text-editor-text"
            title="Next section"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="p-4 bg-white">
        <div className="w-full flex justify-center">
          {svgHtml ? (
            <div
              ref={svgContainerRef}
              className="max-w-full h-auto rounded-md"
              style={{ display: 'inline-block' }}
              dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
          ) : (
            <img
              src={diagramUrl}
              alt="PlantUML Diagram"
              className="max-w-full h-auto rounded-md"
              onError={() => onError("Failed to load diagram")}
            />
          )}
        </div>
      </div>
    </div>
  );
};

