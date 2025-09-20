import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, Download, Maximize2, Eye, Zap, ChevronLeft, ChevronRight, Grid3X3, Layers } from "lucide-react";
import * as plantumlEncoder from "plantuml-encoder";

interface DiagramViewerProps {
  plantUMLCode: string;
  onRefresh?: () => void;
}

export const DiagramViewer = ({ plantUMLCode, onRefresh }: DiagramViewerProps) => {
  const [diagramUrl, setDiagramUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string>("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [sections, setSections] = useState<Array<{name: string, code: string, url: string}>>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [viewMode, setViewMode] = useState<'full' | 'sections' | 'stacked'>('full');

  // Parse sections from PlantUML code
  const parseSections = useCallback((code: string) => {
    const lines = code.split('\n');
    const sectionMarkers: number[] = [];
    const sectionNames: string[] = [];
    
    // Find section markers
    lines.forEach((line, index) => {
      const match = line.match(/^===\s*(.+?)\s*===/);
      if (match) {
        sectionMarkers.push(index);
        sectionNames.push(match[1]);
      }
    });

    if (sectionMarkers.length === 0) {
      return [];
    }

    // Extract participant declarations and initial setup
    const setupLines: string[] = [];
    let foundStart = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('@startuml')) {
        setupLines.push(lines[i]);
        foundStart = true;
        continue;
      }
      
      if (!foundStart) continue;
      
      // Stop at first section marker
      if (line.match(/^===\s*.+?\s*===/)) break;
      
      // Include participant declarations, titles, and other setup
      if (line.startsWith('participant') || 
          line.startsWith('actor') || 
          line.startsWith('boundary') || 
          line.startsWith('control') || 
          line.startsWith('entity') || 
          line.startsWith('database') || 
          line.startsWith('collections') || 
          line.startsWith('queue') || 
          line.startsWith('title') || 
          line.startsWith('skinparam') || 
          line.startsWith('!') || 
          line === '' || 
          line.startsWith("'")) {
        setupLines.push(lines[i]);
      }
    }

    // Create sections
    const sectionsData: Array<{name: string, code: string, url: string}> = [];
    
    for (let i = 0; i < sectionMarkers.length; i++) {
      const startLine = sectionMarkers[i];
      const endLine = i < sectionMarkers.length - 1 ? sectionMarkers[i + 1] : lines.length;
      
      const sectionLines = [
        ...setupLines,
        '', // Empty line separator
        lines[startLine], // Section marker
        ...lines.slice(startLine + 1, endLine).filter(line => !line.match(/^@enduml/)),
        '@enduml'
      ];
      
      const sectionCode = sectionLines.join('\n');
      
      sectionsData.push({
        name: sectionNames[i],
        code: sectionCode,
        url: ''
      });
    }
    
    return sectionsData;
  }, []);

  const generateDiagram = useCallback(async () => {
    if (!plantUMLCode.trim()) {
      setDiagramUrl("");
      setError("");
      setLastGeneratedCode("");
      setNeedsRefresh(false);
      setSections([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Parse sections
      const parsedSections = parseSections(plantUMLCode);
      
      if (parsedSections.length > 0) {
        // Generate URLs for all sections
        const sectionsWithUrls = await Promise.all(
          parsedSections.map(async (section) => {
            const encoded = plantumlEncoder.encode(section.code);
            return {
              ...section,
              url: `https://www.plantuml.com/plantuml/svg/${encoded}`
            };
          })
        );
        
        setSections(sectionsWithUrls);
        setCurrentSection(0);
        setViewMode('sections');
        setDiagramUrl(sectionsWithUrls[0]?.url || '');
      } else {
        // Generate full diagram
        const encoded = plantumlEncoder.encode(plantUMLCode);
        const url = `https://www.plantuml.com/plantuml/svg/${encoded}`;
        setDiagramUrl(url);
        setSections([]);
        setViewMode('full');
      }
      
      setLastGeneratedCode(plantUMLCode);
      setNeedsRefresh(false);
      toast.success("Diagram updated!");
    } catch (err) {
      setError("Invalid PlantUML syntax");
      console.error("PlantUML encoding error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [plantUMLCode, parseSections]);

  // Check if diagram needs refresh when code changes
  useEffect(() => {
    if (plantUMLCode !== lastGeneratedCode && lastGeneratedCode !== "") {
      setNeedsRefresh(true);
    } else if (plantUMLCode === lastGeneratedCode) {
      setNeedsRefresh(false);
    }
  }, [plantUMLCode, lastGeneratedCode]);

  // Generate initial diagram
  useEffect(() => {
    if (plantUMLCode.trim() && lastGeneratedCode === "") {
      generateDiagram();
    }
  }, [plantUMLCode, lastGeneratedCode, generateDiagram]);

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

  const handleSectionChange = (index: number) => {
    if (sections[index]) {
      setCurrentSection(index);
      setDiagramUrl(sections[index].url);
    }
  };

  const toggleViewMode = () => {
    if (sections.length > 0) {
      if (viewMode === 'full') {
        setViewMode('sections');
        setDiagramUrl(sections[currentSection]?.url || '');
      } else if (viewMode === 'sections') {
        setViewMode('stacked');
        setDiagramUrl(''); // Not needed for stacked view
      } else {
        setViewMode('full');
        const encoded = plantumlEncoder.encode(plantUMLCode);
        setDiagramUrl(`https://www.plantuml.com/plantuml/svg/${encoded}`);
      }
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'full': return 'Full';
      case 'sections': return 'Sections';
      case 'stacked': return 'Stacked';
      default: return 'Full';
    }
  };

  const getViewModeIcon = () => {
    switch (viewMode) {
      case 'full': return <Eye className="w-3 h-3 mr-1" />;
      case 'sections': return <Grid3X3 className="w-3 h-3 mr-1" />;
      case 'stacked': return <Layers className="w-3 h-3 mr-1" />;
      default: return <Eye className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <Card className="h-full bg-editor-panel border-editor-border flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-editor-border">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-editor-keyword" />
          <h3 className="text-sm font-medium text-editor-text">Diagram Preview</h3>
          
          {/* Section navigation - only show in sections mode */}
          {sections.length > 0 && viewMode === 'sections' && (
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSectionChange(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
                className="h-6 w-6 p-0 text-editor-comment hover:text-editor-text"
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              
              <span className="text-xs text-editor-comment">
                {sections[currentSection]?.name} ({currentSection + 1}/{sections.length})
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSectionChange(Math.min(sections.length - 1, currentSection + 1))}
                disabled={currentSection === sections.length - 1}
                className="h-6 w-6 p-0 text-editor-comment hover:text-editor-text"
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          {/* Stacked mode indicator */}
          {sections.length > 0 && viewMode === 'stacked' && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs text-editor-comment">
                All sections ({sections.length} total)
              </span>
            </div>
          )}
          
          {needsRefresh && !isLoading && (
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Zap className="w-3 h-3" />
              <span>Press Cmd+Enter to refresh</span>
            </div>
          )}
          {isLoading && (
            <div className="w-3 h-3 border border-editor-keyword border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          {sections.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleViewMode}
              className="h-8 px-2 text-editor-comment hover:text-editor-text hover:bg-editor-background"
              title={`Switch to ${viewMode === 'full' ? 'sections' : viewMode === 'sections' ? 'stacked' : 'full'} view`}
            >
              {getViewModeIcon()}
              <span className="text-xs">{getViewModeLabel()}</span>
            </Button>
          )}
          
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
        ) : viewMode === 'stacked' && sections.length > 0 ? (
          // Stacked view - show all sections vertically
          <div className="p-4 space-y-6">
            {sections.map((section, index) => (
              <div key={index} className="border border-editor-border rounded-lg overflow-hidden">
                <div className="bg-editor-panel px-4 py-2 border-b border-editor-border">
                  <h4 className="text-sm font-medium text-editor-text">
                    {section.name}
                  </h4>
                  <p className="text-xs text-editor-comment">
                    Section {index + 1} of {sections.length}
                  </p>
                </div>
                <div className="p-4 bg-editor-background flex justify-center">
                  <img
                    src={section.url}
                    alt={`Section: ${section.name}`}
                    className="max-w-full h-auto"
                    onError={() => setError(`Failed to load section: ${section.name}`)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : diagramUrl ? (
          // Single diagram view (full or current section)
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