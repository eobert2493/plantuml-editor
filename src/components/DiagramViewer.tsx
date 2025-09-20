import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Download, Maximize2, Eye } from "lucide-react";

interface DiagramViewerProps {
  plantUMLCode: string;
}

export const DiagramViewer = ({ plantUMLCode }: DiagramViewerProps) => {
  const [diagramUrl, setDiagramUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Encode PlantUML code for URL
  const encodeUML = (uml: string): string => {
    const encoded = btoa(unescape(encodeURIComponent(uml)));
    return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const generateDiagram = async () => {
    if (!plantUMLCode.trim()) {
      setDiagramUrl("");
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const encoded = encodeUML(plantUMLCode);
      const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
      setDiagramUrl(url);
    } catch (err) {
      setError("Failed to generate diagram");
      toast.error("Failed to generate diagram");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      generateDiagram();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [plantUMLCode]);

  const handleDownload = async () => {
    if (!diagramUrl) {
      toast.error("No diagram to download");
      return;
    }

    try {
      const response = await fetch(diagramUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Diagram downloaded!");
    } catch (err) {
      toast.error("Failed to download diagram");
    }
  };

  const handleRefresh = () => {
    generateDiagram();
    toast.success("Diagram refreshed!");
  };

  return (
    <Card className="h-full bg-editor-panel border-editor-border flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-editor-border">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-editor-keyword" />
          <h3 className="text-sm font-medium text-editor-text">Diagram Preview</h3>
          {isLoading && (
            <div className="w-3 h-3 border border-editor-keyword border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={!diagramUrl || isLoading}
            className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-editor-background">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-destructive text-sm mb-2">Error</div>
              <div className="text-editor-comment text-xs">{error}</div>
            </div>
          </div>
        ) : !plantUMLCode.trim() ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Maximize2 className="w-12 h-12 text-editor-comment mx-auto mb-3" />
              <div className="text-editor-comment text-sm">
                Start typing PlantUML code to see the diagram preview
              </div>
            </div>
          </div>
        ) : diagramUrl ? (
          <div className="p-4 flex items-center justify-center min-h-full">
            <img
              src={diagramUrl}
              alt="PlantUML Diagram"
              className="max-w-full h-auto"
              onError={() => setError("Failed to load diagram")}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-editor-keyword border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-editor-comment text-sm">Generating diagram...</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};