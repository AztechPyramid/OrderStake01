import React from 'react';
import { X } from 'lucide-react';

interface VerifiedPoolApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerifiedPoolApplicationForm: React.FC<VerifiedPoolApplicationFormProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl h-[90vh] overflow-hidden bg-gradient-to-br from-surface-primary to-surface-secondary border-2 border-accent-primary/30 rounded-2xl shadow-glow animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-accent-primary/20 to-blue-500/20 border-b border-accent-primary/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Apply for Verified Pool</h2>
              <p className="text-sm text-text-secondary">Submit your project for verification</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-elevated transition-colors text-text-secondary hover:text-text-primary"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Google Form Iframe */}
        <div className="h-[calc(90vh-100px)] overflow-hidden">
          <iframe
            src="https://docs.google.com/forms/d/e/1FAIpQLSdVi605ho1j-Lck2OlB0fmcWXRnwwal9E9X6yT81C8eFsdzGQ/viewform?embedded=true"
            width="100%"
            height="100%"
            frameBorder="0"
            marginHeight={0}
            marginWidth={0}
            className="w-full h-full"
          >
            Loading…
          </iframe>
        </div>
      </div>
    </div>
  );
};
