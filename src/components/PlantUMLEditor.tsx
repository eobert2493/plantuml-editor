import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, FileText, Download, Zap } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { plantuml } from "@/lib/plantuml-lang";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

interface PlantUMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => void;
}

export const PlantUMLEditor = ({ value, onChange, onRefresh }: PlantUMLEditorProps) => {
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

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
    EditorView.theme({
      "&": {
        fontSize: "14px",
        fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      },
      ".cm-content": {
        padding: "12px",
        minHeight: "100%",
        color: "hsl(var(--editor-text))",
        caretColor: "hsl(var(--editor-keyword))",
      },
      ".cm-editor": {
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
    EditorView.lineWrapping,
  ];

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      if (onRefresh) {
        onRefresh();
        toast.success("Diagram refreshed!");
      }
    }
  }, [onRefresh]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
      
      <div className="flex-1">
        <CodeMirror
          value={value}
          onChange={(val) => onChange(val)}
          extensions={extensions}
          placeholder="Start typing your PlantUML diagram here..."
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
          style={{
            fontSize: '14px',
            height: '100%',
          }}
        />
      </div>
    </Card>
  );
};