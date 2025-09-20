import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, FileText, Download } from "lucide-react";

interface PlantUMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFormat?: () => void;
}

export const PlantUMLEditor = ({ value, onChange, onFormat }: PlantUMLEditorProps) => {
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

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
      
      <div className="flex-1 relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start typing your PlantUML diagram here..."
          className="h-full resize-none bg-editor-background border-0 text-editor-text placeholder:text-editor-comment font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none pl-14 leading-6"
          style={{
            minHeight: '100%',
            padding: '12px 12px 12px 56px',
            lineHeight: '24px',
          }}
        />
        
        {/* Line numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-editor-panel border-r border-editor-border flex flex-col text-xs text-editor-comment font-mono select-none"
             style={{
               padding: '12px 8px 12px 4px',
               lineHeight: '24px',
             }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i + 1}
              className="flex items-center justify-end min-h-6"
              style={{ 
                height: '24px',
                lineHeight: '24px'
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};