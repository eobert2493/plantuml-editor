interface FullDiagramViewProps {
  svgHtml: string;
  diagramUrl: string;
  svgContainerRef: React.RefObject<HTMLDivElement>;
  onError: (message: string) => void;
}

export const FullDiagramView = ({
  svgHtml,
  diagramUrl,
  svgContainerRef,
  onError,
}: FullDiagramViewProps) => {
  return (
    <div className="w-full flex justify-center">
      {svgHtml ? (
        <div
          ref={svgContainerRef}
          className="max-w-full h-auto rounded-md"
          style={{ display: 'inline-block' }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      ) : (
        <img
          src={diagramUrl}
          alt="PlantUML Diagram"
          className="max-w-full h-auto rounded-md"
          onError={() => onError("Failed to load diagram")}
        />
      )}
    </div>
  );
};

