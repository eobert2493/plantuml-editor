interface ErrorStateProps {
  error: string;
  isServerOnline?: boolean | null;
  serverMode?: 'public' | 'custom';
  wasServerOffline?: boolean;
}

export const ErrorState = ({ error, isServerOnline, serverMode, wasServerOffline }: ErrorStateProps) => {
  const showServerOfflineMessage = isServerOnline === false && serverMode === 'custom';
  const showServerOnlineMessage = isServerOnline === true && serverMode === 'custom' && wasServerOffline;
  
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-lg">
        <div className="text-red-600 text-lg font-semibold mb-3">Error</div>
        <div className="text-gray-900 text-sm mb-4">{error}</div>
        
        {showServerOnlineMessage && (
          <div className="mt-6 p-6 bg-green-50 rounded-lg border-2 border-green-500 shadow-lg">
            <div className="text-sm space-y-3">
              <p className="font-bold text-green-900 text-base">
                Local PlantUML server is now online!
              </p>
              <p className="text-green-800 font-medium">
                Press <kbd className="px-2 py-1 bg-green-100 border border-green-300 rounded text-xs font-mono">Cmd+J</kbd> to refresh the diagram.
              </p>
            </div>
          </div>
        )}
        
        {showServerOfflineMessage && (
          <div className="mt-6 p-6 bg-yellow-50 rounded-lg border-2 border-yellow-400 shadow-lg">
            <div className="text-sm space-y-3">
              <p className="font-bold text-yellow-900 text-base">
                Local PlantUML server is not available
              </p>
              <p className="text-yellow-800 font-medium">You can either:</p>
              <ul className="text-left space-y-3 text-yellow-900">
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <span>Switch to the <strong>public renderer</strong> in Settings (footer)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5">•</span>
                  <div>
                    <div className="mb-2">Start the local server with these commands:</div>
                    <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs space-y-1 overflow-x-auto">
                      <div>docker pull plantuml/plantuml-server:jetty</div>
                      <div>docker run -d -p 9090:8080 plantuml/plantuml-server:jetty</div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

