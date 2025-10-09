import React from 'react';

interface XOrderLogoProps {
  size?: number;
  className?: string;
}

export const XOrderLogo: React.FC<XOrderLogoProps> = ({ size = 40, className = '' }) => {
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      {/* Base ORDER logo */}
      <img 
        src="https://pbs.twimg.com/profile_images/1906711683327787008/2URasTUR_400x400.jpg"
        alt="xORDER"
        className="w-full h-full rounded-full border-2 border-orange-500/50 shadow-md shadow-orange-500/20"
      />
      
      {/* Green dollar sign overlay */}
      <div 
        className="absolute -top-1 -right-1 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg"
        style={{ width: size * 0.4, height: size * 0.4, fontSize: size * 0.25 }}
      >
        <span className="text-white font-bold">$</span>
      </div>
    </div>
  );
};
