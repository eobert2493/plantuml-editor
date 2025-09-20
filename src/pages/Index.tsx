import { useState } from "react";
import { PlantUMLEditor } from "@/components/PlantUMLEditor";
import { DiagramViewer } from "@/components/DiagramViewer";
import { ExampleTemplates } from "@/components/ExampleTemplates";
import { ResizableLayout } from "@/components/ResizableLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileCode2, Github, HelpCircle } from "lucide-react";

const Index = () => {
  const [plantUMLCode, setPlantUMLCode] = useState(`@startuml
title Simple Example

Alice -> Bob: Hello Bob, how are you?
Bob --> Alice: I am good thanks!
Alice -> Bob: What are you doing?
Bob --> Alice: Working on PlantUML diagrams

@enduml`);

  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplateSelect = (template: string) => {
    setPlantUMLCode(template);
    setShowTemplates(false);
  };

  return (
    <div className="h-screen bg-gradient-background flex flex-col">
      {/* Header */}
      <header className="bg-editor-panel border-b border-editor-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-6 h-6 text-primary" />
              <h1 className="text-lg font-bold text-editor-text">PlantUML Editor</h1>
            </div>
            <div className="text-xs text-editor-comment">
              Real-time diagram editor & viewer
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-editor-comment hover:text-editor-text"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-editor-comment hover:text-editor-text"
            >
              <a
                href="https://plantuml.com/guide"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4 mr-2" />
                Guide
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Templates Sidebar */}
        {showTemplates && (
          <div className="w-80 border-r border-editor-border bg-editor-background">
            <ExampleTemplates onSelectTemplate={handleTemplateSelect} />
          </div>
        )}

        {/* Editor and Viewer */}
        <div className="flex-1">
          <ResizableLayout
            leftPanel={
              <PlantUMLEditor
                value={plantUMLCode}
                onChange={setPlantUMLCode}
              />
            }
            rightPanel={
              <DiagramViewer plantUMLCode={plantUMLCode} />
            }
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-editor-panel border-t border-editor-border px-4 py-2">
        <div className="flex items-center justify-between text-xs text-editor-comment">
          <div>
            Ready • {plantUMLCode.split('\n').length} lines
          </div>
          <div className="flex items-center gap-4">
            <span>PlantUML Server Online</span>
            <span>•</span>
            <span>Auto-refresh enabled</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
