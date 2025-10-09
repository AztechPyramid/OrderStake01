import { useRouter } from 'next/router';

interface PlatformCardProps {
  title: string;
  description: string;
  url: string;
  logo: string;
  category: string;
  isNative?: boolean; // For internal pages, use routing; for external use new tab
}

export const PlatformCard = ({ 
  title, 
  description, 
  url, 
  logo, 
  category
}: PlatformCardProps) => {
  const router = useRouter();

  const handlePlatformClick = () => {
    if (url.startsWith('/')) {
      // Internal page - use Next.js routing
      router.push(url);
    } else {
      // External URL - open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      <div 
        onClick={handlePlatformClick}
        className="bg-gradient-to-br from-gray-800 via-gray-800 to-orange-900/20 border-2 border-orange-600/30 rounded-xl p-6 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-600/20 transition-all duration-300 cursor-pointer group"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <img 
              src={logo} 
              alt={title}
              className="w-12 h-12 rounded-lg border-2 border-orange-500/30 shadow-md shadow-orange-500/20"
            />
            <div>
              <h3 className="text-white font-bold text-lg group-hover:text-orange-400 transition-colors">
                {title}
              </h3>
              <p className="text-orange-200/70 text-sm">{category}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-orange-300">
            {url.startsWith('/') ? (
              <span className="text-sm">�️</span>
            ) : (
              <span className="text-sm">⚔️</span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-orange-100/80 text-sm leading-relaxed mb-4">
          {description}
        </p>

        {/* URL Preview */}
        <div className="flex items-center space-x-2 text-xs text-orange-200/50">
          <span>�️</span>
          <span className="truncate">{url}</span>
        </div>

        {/* Hover effect */}
        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-orange-400 text-sm font-medium">
            {url.startsWith('/') ? '🛡️ Enter Arena →' : '⚔️ Enter Battle →'}
          </div>
        </div>
      </div>
    </>
  );
};
