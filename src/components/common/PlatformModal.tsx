import { useEffect, useRef, useState } from 'react';

interface PlatformModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const PlatformModal = ({ isOpen, onClose, url, title }: PlatformModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
      setLoadError(false);
      
      // Timeout for loading - if iframe doesn't load in 15 seconds, show error
      const loadTimeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setLoadError(true);
        }
      }, 15000);

      return () => {
        clearTimeout(loadTimeout);
      };
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isLoading]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative w-full h-full max-w-7xl max-h-full mx-2 my-2 sm:mx-4 sm:my-4 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white truncate pr-4">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={title}
            loading="eager"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
          
          {/* Loading placeholder */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-400">Loading {title}...</p>
                <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {loadError && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center z-10">
              <div className="text-center max-w-md">
                <div className="text-yellow-400 text-4xl mb-4">🚀</div>
                <h3 className="text-white text-xl mb-2">{title}</h3>
                <p className="text-gray-400 mb-4">
                  This platform cannot be displayed in an embedded view due to security restrictions.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      window.open(url, '_blank', 'noopener,noreferrer');
                      onClose();
                    }}
                    className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-3 rounded-lg transition-colors font-semibold"
                  >
                    🌐 Open in New Tab
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-4">
                  URL: {url}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
