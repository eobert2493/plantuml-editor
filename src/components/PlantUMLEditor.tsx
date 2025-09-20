import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, FileText, Download, Zap, Settings, ArrowRight, Users } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { plantuml } from "@/lib/plantuml-lang";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView, keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";

interface PlantUMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => void;
}

interface CodeSection {
  name: string;
  startMarkers: string[];
  endMarkers: string[];
  icon: string;
}

export const PlantUMLEditor = ({ value, onChange, onRefresh }: PlantUMLEditorProps) => {
  const [lineCount, setLineCount] = useState(1);
  const [activeTab, setActiveTab] = useState<'full' | 'setup' | 'sequence'>('full');
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  
  // Define code sections
  const codeSections: Record<string, CodeSection> = {
    setup: {
      name: 'Setup',
      startMarkers: ['@startuml', 'participant', 'actor', 'boundary', 'control', 'entity', 'database', 'collections', 'queue', 'box', 'title', 'skinparam', 'note', 'legend'],
      endMarkers: ['->', '<-', '-->', '<--', '..>', '<..'],
      icon: 'settings'
    },
    sequence: {
      name: 'Sequence',
      startMarkers: ['->', '<-', '-->', '<--', '..>', '<..', 'activate', 'deactivate', 'note', 'alt', 'else', 'opt', 'loop', 'par', 'break'],
      endMarkers: ['@enduml'],
      icon: 'flow'
    }
  };

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  // Parse content based on active tab
  const getDisplayContent = useCallback(() => {
    if (activeTab === 'full') {
      return value;
    }

    const lines = value.split('\n');
    let displayLines: string[] = [];
    let inTargetSection = false;

    if (activeTab === 'setup') {
      // Include @startuml and setup elements
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('@startuml') || 
            trimmed.startsWith('title') ||
            trimmed.startsWith('participant') ||
            trimmed.startsWith('actor') ||
            trimmed.startsWith('boundary') ||
            trimmed.startsWith('control') ||
            trimmed.startsWith('entity') ||
            trimmed.startsWith('database') ||
            trimmed.startsWith('collections') ||
            trimmed.startsWith('queue') ||
            trimmed.startsWith('box') ||
            trimmed.startsWith('skinparam') ||
            trimmed.startsWith('note') && !trimmed.includes('->') ||
            trimmed.startsWith('legend') ||
            trimmed.startsWith('!') ||
            trimmed === '' ||
            trimmed.startsWith("'")) {
          displayLines.push(line);
        } else if (trimmed.includes('->') || trimmed.includes('<-')) {
          // Stop at first sequence interaction
          break;
        }
      }
      displayLines.push('@enduml');
      
    } else if (activeTab === 'sequence') {
      // Only show sequence interactions (no setup)
      displayLines.push('@startuml');
      displayLines.push('');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Include sequence interactions and flow control
        if (trimmed.includes('->') || 
            trimmed.includes('<-') ||
            trimmed.startsWith('activate') ||
            trimmed.startsWith('deactivate') ||
            trimmed.startsWith('note') && (trimmed.includes('->') || trimmed.includes('of') || trimmed.includes('over')) ||
            trimmed.startsWith('alt') ||
            trimmed.startsWith('else') ||
            trimmed.startsWith('opt') ||
            trimmed.startsWith('loop') ||
            trimmed.startsWith('par') ||
            trimmed.startsWith('break') ||
            trimmed.startsWith('critical') ||
            trimmed.startsWith('group') ||
            trimmed.startsWith('end') ||
            trimmed.startsWith('==') ||
            (trimmed === '' && displayLines.length > 2)) { // Empty lines only after we've started adding content
          if (!trimmed.startsWith('@enduml')) {
            displayLines.push(line);
          }
        }
      }
      
      displayLines.push('@enduml');
    }

    return displayLines.join('\n');
  }, [value, activeTab]);

  // Create syntax highlighting theme
  const highlightStyle = HighlightStyle.define([
    { tag: tags.comment, color: "hsl(var(--editor-comment))" },
    { tag: tags.keyword, color: "hsl(var(--editor-keyword))" },
    { tag: tags.string, color: "hsl(var(--editor-string))" },
    { tag: tags.number, color: "hsl(var(--editor-number))" },
    { tag: tags.operator, color: "hsl(var(--editor-keyword))" },
    { tag: tags.punctuation, color: "hsl(var(--editor-text))" },
    { tag: tags.meta, color: "hsl(var(--editor-string))" },
  ]);

  // CodeMirror extensions
  const extensions = [
    plantuml(),
    syntaxHighlighting(highlightStyle),
    EditorView.domEventHandlers({
      keydown: (event, _view) => {
        const e = event as KeyboardEvent;
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (onRefresh) {
            onRefresh();
            toast.success("Diagram refreshed!");
          }
          return true;
        }
        return false;
      },
    }),
    keymap.of([
      {
        key: "Mod-Enter",
        preventDefault: true,
        run: () => {
          if (onRefresh) {
            onRefresh();
            toast.success("Diagram refreshed!");
          }
          return true;
        },
      },
    ]),
    EditorView.theme({
      "&": {
        fontSize: "14px",
        fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        height: "100%",
      },
      ".cm-content": {
        padding: "12px",
        color: "hsl(var(--editor-text))",
        caretColor: "hsl(var(--editor-keyword))",
      },
      ".cm-editor": {
        height: "100%",
      },
      ".cm-scroller": {
        fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        height: "100%",
      },
      ".cm-focused": {
        outline: "none",
      },
      ".cm-gutters": {
        backgroundColor: "hsl(var(--editor-panel))",
        color: "hsl(var(--editor-comment))",
        border: "none",
        borderRight: "1px solid hsl(var(--editor-border))",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
      },
      ".cm-lineNumbers .cm-gutterElement": {
        color: "hsl(var(--editor-comment))",
        fontSize: "12px",
      },
    }),
  ];

  // Refresh on Mod+Enter when editor is focused
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isEditorFocused) return;
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (onRefresh) {
          onRefresh();
          toast.success('Diagram refreshed!');
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isEditorFocused, onRefresh]);


  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleExport = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.puml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("PlantUML file exported!");
  };

  return (
    <Card className="h-full bg-editor-panel border-editor-border flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-editor-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-editor-keyword" />
          <h3 className="text-sm font-medium text-editor-text">PlantUML Editor</h3>
          <span className="text-xs text-editor-comment">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 px-2 text-editor-comment hover:text-editor-text hover:bg-editor-background"
              title="Refresh diagram (Cmd+Enter)"
            >
              <Zap className="w-3 h-3 mr-1" />
              <span className="text-xs">Refresh</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-8 w-8 p-0 text-editor-comment hover:text-editor-text hover:bg-editor-background"
          >
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={activeTab === 'full' ? value : getDisplayContent()}
          onChange={(val) => {
            if (activeTab === 'full') {
              onChange(val);
            }
            // For filtered views, we'll just show read-only content
          }}
          extensions={extensions}
          placeholder="Start typing your PlantUML diagram here..."
          editable={activeTab === 'full'}
          onFocus={() => setIsEditorFocused(true)}
          onBlur={() => setIsEditorFocused(false)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            autocompletion: true,
            closeBrackets: true,
            searchKeymap: true,
          }}
          theme="dark"
          height="100%"
          style={{
            fontSize: '14px',
            height: '100%',
            overflow: 'auto',
          }}
        />
      </div>
      
      {/* Tab Navigation */}
      <div className="border-t border-editor-border bg-editor-panel px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant={activeTab === 'full' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('full')}
            className="h-7 px-2 text-xs text-editor-comment hover:text-editor-text"
          >
            <FileText className="w-3 h-3 mr-1" />
            Full
          </Button>
          <Button
            variant={activeTab === 'setup' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('setup')}
            className="h-7 px-2 text-xs text-editor-comment hover:text-editor-text"
          >
            <Settings className="w-3 h-3 mr-1" />
            Setup
          </Button>
          <Button
            variant={activeTab === 'sequence' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('sequence')}
            className="h-7 px-2 text-xs text-editor-comment hover:text-editor-text"
          >
            <ArrowRight className="w-3 h-3 mr-1" />
            Sequence
          </Button>
        </div>
      </div>
    </Card>
  );
};