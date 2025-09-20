import { useState, useEffect, useCallback } from "react";
import { PlantUMLEditor } from "@/components/PlantUMLEditor";
import { DiagramViewer } from "@/components/DiagramViewer";
import { ExampleTemplates } from "@/components/ExampleTemplates";
import { ResizableLayout } from "@/components/ResizableLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileCode2, Github, HelpCircle, FileText, Settings, ArrowRight } from "lucide-react";

const Index = () => {
  const [plantUMLCode, setPlantUMLCode] = useState(`@startuml
title Simple Example

participant "User" as U
participant "Browser" as B  
participant "Server" as S

U -> B: Enter URL
B -> S: HTTP Request
S -> B: HTTP Response  
B -> U: Display Page

@enduml`);

  const [showTemplates, setShowTemplates] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeEditorTab, setActiveEditorTab] = useState<'full' | 'setup' | 'sequence'>('full');
  const [showLeftPanel, setShowLeftPanel] = useState(true);

  const handleTemplateSelect = (template: string) => {
    setPlantUMLCode(template);
    setShowTemplates(false);
    // Auto-refresh when template is selected
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
      event.preventDefault();
      setShowLeftPanel(prev => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
              showLeftPanel ? (
                <PlantUMLEditor
                  value={plantUMLCode}
                  onChange={setPlantUMLCode}
                  onRefresh={handleRefresh}
                  activeTab={activeEditorTab}
                  onTabChange={setActiveEditorTab}
                />
              ) : null
            }
            rightPanel={
              <DiagramViewer 
                plantUMLCode={plantUMLCode} 
                key={refreshTrigger}
                onRefresh={handleRefresh}
              />
            }
            hideLeftPanel={!showLeftPanel}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-editor-panel border-t border-editor-border px-4 py-2">
        <div className="flex items-center justify-between text-xs text-editor-comment">
          <div className="flex items-center gap-3">
            {/* Editor Tab Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant={activeEditorTab === 'full' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveEditorTab('full')}
                className="h-6 px-2 text-xs text-editor-comment hover:text-editor-text"
              >
                <FileText className="w-3 h-3 mr-1" />
                Full
              </Button>
              <Button
                variant={activeEditorTab === 'setup' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveEditorTab('setup')}
                className="h-6 px-2 text-xs text-editor-comment hover:text-editor-text"
              >
                <Settings className="w-3 h-3 mr-1" />
                Setup
              </Button>
              <Button
                variant={activeEditorTab === 'sequence' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveEditorTab('sequence')}
                className="h-6 px-2 text-xs text-editor-comment hover:text-editor-text"
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                Sequence
              </Button>
            </div>
            <div className="text-editor-border">•</div>
            <div>
              Ready • {plantUMLCode.split('\n').length} lines
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span>PlantUML Server Online</span>
            <span>•</span>
            <span>Press Cmd+J to refresh • Cmd+B to toggle editor</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
