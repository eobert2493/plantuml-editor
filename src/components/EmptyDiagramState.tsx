import { Maximize2 } from "lucide-react";

export const EmptyDiagramState = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Maximize2 className="w-12 h-12 text-editor-comment mx-auto mb-3" />
        <div className="text-editor-comment text-sm">
          Start typing PlantUML code to see the diagram preview
        </div>
      </div>
    </div>
  );
};

