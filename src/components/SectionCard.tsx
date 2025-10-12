import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface SectionCardProps {
  sectionName: string;
  sectionIndex: number;
  totalSections: number;
  sectionUrl: string;
  svgHtml?: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onError: (message: string) => void;
}

export const SectionCard = ({
  sectionName,
  sectionIndex,
  totalSections,
  sectionUrl,
  svgHtml,
  isExpanded,
  onToggleExpand,
  onError,
}: SectionCardProps) => {
  return (
    <div className="border border-section-container-border rounded-lg overflow-hidden">
      <div 
        className="bg-section-header-bg px-4 py-3 border-b border-section-container-border flex items-center justify-between cursor-pointer hover:bg-opacity-90 transition-all"
        onClick={onToggleExpand}
      >
        <div>
          <h4 className="text-sm font-semibold text-section-header-text">
            {sectionName}
          </h4>
          <p className="text-xs text-section-header-text/70">
            Section {sectionIndex + 1} of {totalSections}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-section-header-text/70 hover:text-section-header-text"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>
      {isExpanded && (
        <div className="p-4 bg-white overflow-hidden">
          <div className="w-full flex justify-center stacked-section-content">
            {svgHtml ? (
              <div
                className="max-w-full h-auto rounded-md"
                style={{ display: 'inline-block' }}
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            ) : (
              <img
                src={sectionUrl}
                alt={`Section: ${sectionName}`}
                className="max-w-full h-auto rounded-md"
                onError={() => onError(`Failed to load section: ${sectionName}`)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

