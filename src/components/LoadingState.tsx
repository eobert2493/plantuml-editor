export const LoadingState = () => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-editor-keyword border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-editor-comment text-sm">Generating diagram...</div>
      </div>
    </div>
  );
};

