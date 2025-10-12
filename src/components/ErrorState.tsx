interface ErrorStateProps {
  error: string;
}

export const ErrorState = ({ error }: ErrorStateProps) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-destructive text-sm mb-2">Error</div>
        <div className="text-editor-comment text-xs">{error}</div>
      </div>
    </div>
  );
};

