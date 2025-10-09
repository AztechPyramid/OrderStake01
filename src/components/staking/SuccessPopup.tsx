import React from 'react';


interface SuccessPopupProps {
  show: boolean;
  type?: 'stake' | 'unstake' | 'claim' | 'add-liquidity' | 'remove-liquidity';
  rewardToken?: string;
  rewardTokenLogo?: string;
}

const getPopupText = (type: 'stake' | 'unstake' | 'claim' | 'add-liquidity' | 'remove-liquidity' = 'stake') => {
  switch (type) {
    case 'stake':
      return {
        title: 'Success!',
        main: 'Staking Completed',
        sub: 'Your staking transaction was successful.'
      };
    case 'unstake':
      return {
        title: 'Success!',
        main: 'Unstake Completed',
        sub: 'Your unstake transaction was successful.'
      };
    case 'claim':
      return {
        title: 'Success!',
        main: 'Claim Completed',
        sub: 'Your claim transaction was successful.'
      };
    case 'add-liquidity':
      return {
        title: 'Success!',
        main: 'Liquidity Added',
        sub: 'Your add liquidity transaction was successful.'
      };
    case 'remove-liquidity':
      return {
        title: 'Success!',
        main: 'Liquidity Removed',
        sub: 'Your remove liquidity transaction was successful.'
      };
    default:
      return {
        title: 'Success!',
        main: 'Transaction Completed',
        sub: 'Your transaction was successful.'
      };
  }
};

const SuccessPopup: React.FC<SuccessPopupProps> = ({ show, type = 'stake', rewardToken, rewardTokenLogo }) => {
  if (!show) return null;
  const { title, main, sub } = getPopupText(type);
  
  // For different types, show different logos
  let logoSrc = '/order-logo.jpg';
  let logoAlt = 'Order Logo';
  
  if (type === 'claim' && rewardTokenLogo && rewardToken) {
    logoSrc = rewardTokenLogo;
    logoAlt = rewardToken + ' Logo';
  } else if (type === 'add-liquidity' || type === 'remove-liquidity') {
    // Use ORDER/AVAX dual logo for liquidity operations
    logoSrc = '/order-logo.jpg'; // Primary logo, we'll add AVAX overlay below
    logoAlt = 'ORDER/AVAX LP';
  }
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
      <div
        className="bg-gradient-to-br from-[#e8f5e9] via-[#b2dfdb] to-[#a5d6a7] border-4 border-[#6fcf97] shadow-2xl rounded-3xl px-16 py-12 flex flex-col items-center animate-pop-success"
        style={{ minWidth: 420, minHeight: 340, boxShadow: '0 8px 48px 0 #6fcf9780' }}
      >
        {/* Logo section with dual logos for liquidity operations */}
        {type === 'add-liquidity' || type === 'remove-liquidity' ? (
          <div className="relative w-32 h-32 mb-6">
            {/* ORDER logo */}
            <img
              src="/order-logo.jpg"
              alt="ORDER"
              className="absolute top-0 left-0 w-20 h-20 rounded-full shadow-xl animate-bounce z-10"
              style={{ filter: 'drop-shadow(0 0 32px #6fcf97)' }}
            />
            {/* AVAX logo */}
            <img
              src="/assets/avax-logo-showdetails.png"
              alt="AVAX"
              className="absolute bottom-0 right-0 w-20 h-20 rounded-full shadow-xl animate-bounce z-10"
              style={{ 
                filter: 'drop-shadow(0 0 32px #6fcf97)',
                animationDelay: '0.2s'
              }}
            />
          </div>
        ) : (
          <img
            src={logoSrc}
            alt={logoAlt}
            className="w-32 h-32 mb-6 rounded-full shadow-xl animate-bounce"
            style={{ filter: 'drop-shadow(0 0 32px #6fcf97)' }}
          />
        )}
        
        <div className="text-4xl font-extrabold text-[#388e3c] mb-2 drop-shadow-lg tracking-tight">{title}</div>
        <div className="text-[#388e3c] text-2xl font-semibold tracking-wide mb-1">{main}</div>
        <div className="text-[#388e3c] text-lg opacity-70 font-medium">{sub}</div>
      </div>
      <style>{`
        @keyframes pop-success {
          0% { transform: scale(0.7) translateY(40px); opacity: 0; }
          60% { transform: scale(1.1) translateY(-10px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-pop-success {
          animation: pop-success 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
      `}</style>
    </div>
  );
};

export default SuccessPopup;
