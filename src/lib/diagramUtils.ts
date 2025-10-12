export const parseSections = (code: string) => {
  const lines = code.split('\n');
  const sectionMarkers: number[] = [];
  const sectionNames: string[] = [];
  
  // Find section markers (== Section Name ==)
  lines.forEach((line, index) => {
    const match = line.match(/^==\s*(.+?)\s*==/);
    if (match) {
      sectionMarkers.push(index);
      sectionNames.push(match[1]);
    }
  });

  if (sectionMarkers.length === 0) {
    return [];
  }

  // Extract declarations and setup from entire document
  const setupLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (
      line.startsWith('@startuml') ||
      line.startsWith('participant') ||
      line.startsWith('actor') ||
      line.startsWith('boundary') ||
      line.startsWith('control') ||
      line.startsWith('entity') ||
      line.startsWith('database') ||
      line.startsWith('collections') ||
      line.startsWith('queue') ||
      line.startsWith('title') ||
      line.startsWith('skinparam') ||
      line.startsWith('legend') ||
      line.startsWith('box') ||
      line.startsWith('end box') ||
      (line.startsWith('note') && !line.includes('->') && !line.includes(' of ') && !line.includes(' over ')) ||
      line.startsWith('!') ||
      line === '' ||
      line.startsWith("'")
    ) {
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
      '',
      lines[startLine],
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
};

export const sanitizeFileName = (name: string) => {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
};

export const getSvgSize = (svgText: string): { width: number; height: number } => {
  const widthMatch = svgText.match(/width="(\d+(?:\.\d+)?)px"/);
  const heightMatch = svgText.match(/height="(\d+(?:\.\d+)?)px"/);
  const viewBoxMatch = svgText.match(/viewBox="[\d\.]+ [\d\.]+ ([\d\.]+) ([\d\.]+)"/);
  let width = widthMatch ? parseFloat(widthMatch[1]) : (viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 0);
  let height = heightMatch ? parseFloat(heightMatch[1]) : (viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 0);
  if (!width || !height) {
    width = 800;
    height = 600;
  }
  return { width, height };
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

