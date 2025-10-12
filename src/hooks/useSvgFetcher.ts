import { useState, useEffect } from "react";

export const useSvgFetcher = (
  diagramUrl: string,
  viewMode: 'full' | 'sections' | 'stacked'
) => {
  const [svgHtml, setSvgHtml] = useState<string>("");

  // Fetch SVG text for inline rendering (full/sections only)
  useEffect(() => {
    let cancelled = false;
    const shouldInline = !!diagramUrl && (viewMode === 'full' || viewMode === 'sections');
    if (!shouldInline) {
      setSvgHtml("");
      return;
    }
    
    (async () => {
      try {
        const res = await fetch(diagramUrl);
        const text = await res.text();
        if (!cancelled) setSvgHtml(text);
      } catch (e) {
        if (!cancelled) setSvgHtml('');
      }
    })();
    
    return () => { cancelled = true; };
  }, [diagramUrl, viewMode]);

  return svgHtml;
};

