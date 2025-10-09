'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Shield, Info } from 'lucide-react';

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onAccept }) => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isScrolledToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (isScrolledToBottom) {
      setHasScrolled(true);
    }
  };

  const handleAccept = () => {
    if (agreed && hasScrolled) {
      onAccept();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gradient-surface border-2 border-accent-primary rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500/20 to-yellow-500/20 border-b border-red-500/30 p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">⚠️ Important Disclaimer & Terms</h2>
              <p className="text-sm text-text-secondary mt-1">Please read carefully before proceeding</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6"
          onScroll={handleScroll}
        >
          {/* Warning Banner */}
          <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-red-400 mb-2">CRITICAL WARNING</h3>
                <p className="text-sm text-text-primary">
                  The Ecosystem Staking platform is a permissionless and decentralized system. 
                  <strong className="text-red-400"> Anyone can create a staking pool with any token.</strong> 
                  Malicious actors may create pools with scam tokens, worthless tokens, or tokens designed to steal your funds.
                </p>
              </div>
            </div>
          </div>

          {/* Main Disclaimer Content */}
          <div className="space-y-4">
            {/* 1. No Responsibility */}
            <div className="bg-surface-secondary rounded-lg p-4 border border-border-primary">
              <h3 className="text-lg font-semibold text-accent-primary mb-3 flex items-center gap-2">
                <span className="bg-accent-primary/20 px-2 py-1 rounded text-sm">1</span>
                No Responsibility for User-Created Pools
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
                <li><strong>Order Protocol and its team have NO control, responsibility, or liability</strong> for any staking pools created by users</li>
                <li>We do not verify, audit, or endorse any user-created staking pools or tokens</li>
                <li>Pool creators are solely responsible for their pools and all associated risks</li>
                <li>We cannot recover funds lost to malicious pools or scam tokens</li>
                <li>All pools are created and managed entirely by independent third parties</li>
              </ul>
            </div>

            {/* 2. Financial Risks */}
            <div className="bg-surface-secondary rounded-lg p-4 border border-border-primary">
              <h3 className="text-lg font-semibold text-accent-primary mb-3 flex items-center gap-2">
                <span className="bg-accent-primary/20 px-2 py-1 rounded text-sm">2</span>
                Financial Risks & Investment Warning
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
                <li><strong>This is NOT financial advice.</strong> We do not recommend any specific tokens or pools</li>
                <li>Cryptocurrency investments carry extreme risk including total loss of capital</li>
                <li>Staking tokens may result in impermanent loss, token devaluation, or complete loss</li>
                <li>Reward tokens may be worthless, illiquid, or impossible to sell</li>
                <li>APY calculations are estimates only and may be inaccurate or misleading</li>
                <li><strong>Never stake more than you can afford to lose completely</strong></li>
              </ul>
            </div>

            {/* 3. Scam & Security Risks */}
            <div className="bg-surface-secondary rounded-lg p-4 border border-border-primary">
              <h3 className="text-lg font-semibold text-accent-primary mb-3 flex items-center gap-2">
                <span className="bg-accent-primary/20 px-2 py-1 rounded text-sm">3</span>
                Scam Tokens & Security Risks
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
                <li>Pools may contain <strong>scam tokens, rug pulls, honeypots, or malicious contracts</strong></li>
                <li>Reward tokens may have hidden fees, transfer restrictions, or backdoors</li>
                <li>Token contracts may have owner privileges allowing token theft or manipulation</li>
                <li>Smart contracts may contain bugs, vulnerabilities, or exploits</li>
                <li><strong>Always verify token contracts independently before staking</strong></li>
                <li>Use blockchain explorers and multiple sources to research tokens</li>
              </ul>
            </div>

            {/* 4. No Guarantees */}
            <div className="bg-surface-secondary rounded-lg p-4 border border-border-primary">
              <h3 className="text-lg font-semibold text-accent-primary mb-3 flex items-center gap-2">
                <span className="bg-accent-primary/20 px-2 py-1 rounded text-sm">4</span>
                No Guarantees or Warranties
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
                <li>Platform is provided "AS IS" without warranties of any kind</li>
                <li>No guarantee of uptime, functionality, or accuracy of information</li>
                <li>Pool data, APYs, and token information may be incorrect or outdated</li>
                <li>Smart contracts may fail, be exploited, or behave unexpectedly</li>
                <li>No guarantee that you will receive promised rewards or be able to unstake</li>
              </ul>
            </div>

            {/* 5. Legal Compliance */}
            <div className="bg-surface-secondary rounded-lg p-4 border border-border-primary">
              <h3 className="text-lg font-semibold text-accent-primary mb-3 flex items-center gap-2">
                <span className="bg-accent-primary/20 px-2 py-1 rounded text-sm">5</span>
                Legal & Regulatory Compliance
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
                <li>You are responsible for compliance with all applicable laws in your jurisdiction</li>
                <li>Cryptocurrency regulations vary by country and may change without notice</li>
                <li>Using this platform may be illegal or restricted in some jurisdictions</li>
                <li>You are responsible for all tax obligations related to staking activities</li>
                <li>We do not provide legal, tax, or regulatory advice</li>
              </ul>
            </div>

            {/* 6. User Responsibilities */}
            <div className="bg-surface-secondary rounded-lg p-4 border border-border-primary">
              <h3 className="text-lg font-semibold text-accent-primary mb-3 flex items-center gap-2">
                <span className="bg-accent-primary/20 px-2 py-1 rounded text-sm">6</span>
                Your Responsibilities
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
                <li><strong>Do Your Own Research (DYOR)</strong> - Always research pools and tokens independently</li>
                <li>Verify all token contracts on blockchain explorers before staking</li>
                <li>Check token holder distribution, liquidity, and trading history</li>
                <li>Read and understand smart contract code or hire an auditor</li>
                <li>Secure your wallet with hardware wallets and strong passwords</li>
                <li>Never share your private keys or seed phrases with anyone</li>
                <li>Start with small amounts to test pools before committing large sums</li>
              </ul>
            </div>

            {/* 7. Privacy */}
            <div className="bg-surface-secondary rounded-lg p-4 border border-border-primary">
              <h3 className="text-lg font-semibold text-accent-primary mb-3 flex items-center gap-2">
                <span className="bg-accent-primary/20 px-2 py-1 rounded text-sm">7</span>
                Privacy Notice
              </h3>
              <ul className="space-y-2 text-sm text-text-secondary list-disc list-inside">
                <li>All transactions are recorded permanently on the blockchain</li>
                <li>Your wallet address and transaction history are publicly visible</li>
                <li>We do not collect personal information, but blockchain data is transparent</li>
                <li>Third parties may track your wallet activity and holdings</li>
              </ul>
            </div>

            {/* 8. Limitation of Liability */}
            <div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Limitation of Liability
              </h3>
              <p className="text-sm text-text-primary mb-2">
                <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong>
              </p>
              <ul className="space-y-2 text-sm text-text-primary list-disc list-inside">
                <li>Order Protocol, its team, contributors, and affiliates shall NOT be liable for any losses</li>
                <li>This includes direct, indirect, incidental, consequential, or punitive damages</li>
                <li>We are not responsible for: lost profits, lost tokens, scams, hacks, or exploits</li>
                <li>Your use of this platform is entirely at your own risk</li>
                <li><strong>YOU ALONE ARE RESPONSIBLE FOR YOUR INVESTMENT DECISIONS</strong></li>
              </ul>
            </div>
          </div>

          {/* Scroll Indicator */}
          {!hasScrolled && (
            <div className="sticky bottom-0 bg-gradient-to-t from-surface-primary via-surface-primary to-transparent pt-8 pb-4 text-center">
              <p className="text-sm text-accent-primary animate-pulse">
                ⬇️ Please scroll down to read all terms before accepting ⬇️
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border-primary p-6 bg-surface-secondary rounded-b-2xl">
          {/* Checkbox */}
          <label className="flex items-start gap-3 mb-4 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-2 border-accent-primary bg-surface-primary checked:bg-accent-primary checked:border-accent-primary focus:ring-2 focus:ring-accent-primary/50 cursor-pointer"
            />
            <span className="text-sm text-text-primary group-hover:text-text-primary transition-colors">
              I have read, understood, and agree to all the terms, disclaimers, and warnings above. 
              I acknowledge that <strong>I am solely responsible</strong> for my investment decisions and 
              understand that <strong>Order Protocol is not responsible</strong> for any user-created pools or losses incurred.
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={!agreed || !hasScrolled}
              className={`flex-1 py-3 px-6 rounded-lg font-bold text-white transition-all ${
                agreed && hasScrolled
                  ? 'bg-gradient-to-r from-accent-primary to-accent-secondary hover:shadow-lg hover:scale-105'
                  : 'bg-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              {!hasScrolled ? '📜 Scroll to Continue' : !agreed ? '☑️ Check the Box to Continue' : '✅ I Accept - Continue to Ecosystem'}
            </button>
          </div>

          {!hasScrolled && (
            <p className="text-xs text-center text-text-tertiary mt-3">
              You must scroll through and read all terms before accepting
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
