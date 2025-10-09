// Benqi-Inspired Dark Theme Configuration
export const theme = {
  colors: {
    // Primary Dark Palette (Benqi-inspired)
    background: {
      primary: '#0B0E1A',      // Deep navy background
      secondary: '#1A1F36',    // Darker blue
      tertiary: '#242B47',     // Card backgrounds
      glass: 'rgba(26, 31, 54, 0.8)', // Glass morphism
    },
    surface: {
      primary: '#1E2235',      // Main surface
      secondary: '#242B47',    // Secondary surface
      elevated: '#2A3356',     // Elevated surfaces
      glass: 'rgba(30, 34, 53, 0.9)', // Glass effect
    },
    accent: {
      primary: '#00D4AA',      // Benqi teal green
      secondary: '#4FFFDF',    // Lighter teal
      tertiary: '#00B890',     // Darker teal
    },
    text: {
      primary: '#FFFFFF',      // Primary text
      secondary: '#94A3B8',    // Secondary text
      tertiary: '#64748B',     // Muted text
      accent: '#00D4AA',       // Accent text
    },
    status: {
      success: '#10B981',      // Success green
      warning: '#F59E0B',      // Warning amber
      error: '#EF4444',        // Error red
      info: '#3B82F6',         // Info blue
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0B0E1A 0%, #1A1F36 100%)',
      accent: 'linear-gradient(135deg, #00D4AA 0%, #4FFFDF 100%)',
      surface: 'linear-gradient(135deg, #1E2235 0%, #242B47 100%)',
      glass: 'linear-gradient(135deg, rgba(26, 31, 54, 0.9) 0%, rgba(30, 34, 53, 0.8) 100%)',
    },
    borders: {
      primary: '#2A3356',      // Primary borders
      accent: '#00D4AA',       // Accent borders
      muted: '#1E2235',        // Muted borders
    }
  },
  effects: {
    blur: {
      sm: 'blur(4px)',
      md: 'blur(8px)',
      lg: 'blur(16px)',
    },
    shadow: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      glow: '0 0 20px rgba(0, 212, 170, 0.3)',
      card: '0 8px 32px rgba(0, 0, 0, 0.2)',
    },
    border: {
      radius: {
        sm: '0.375rem',    // 6px
        md: '0.5rem',      // 8px
        lg: '0.75rem',     // 12px
        xl: '1rem',        // 16px
        '2xl': '1.5rem',   // 24px
      }
    }
  },
  spacing: {
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    section: {
      sm: '1rem',          // 16px
      md: '1.5rem',        // 24px
      lg: '2rem',          // 32px
      xl: '3rem',          // 48px
    }
  },
  typography: {
    fontSize: {
      xs: '0.75rem',       // 12px
      sm: '0.875rem',      // 14px
      base: '1rem',        // 16px
      lg: '1.125rem',      // 18px
      xl: '1.25rem',       // 20px
      '2xl': '1.5rem',     // 24px
      '3xl': '1.875rem',   // 30px
      '4xl': '2.25rem',    // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    }
  }
} as const;

// Theme utility functions
export const getGradientBackground = (type: keyof typeof theme.colors.gradients) => {
  return theme.colors.gradients[type];
};

export const getGlassEffect = (opacity: number = 0.8) => {
  return {
    background: `rgba(26, 31, 54, ${opacity})`,
    backdropFilter: 'blur(16px)',
    border: `1px solid ${theme.colors.borders.primary}`,
  };
};

export const getCardStyles = () => {
  return {
    background: theme.colors.gradients.surface,
    border: `1px solid ${theme.colors.borders.primary}`,
    borderRadius: theme.effects.border.radius.xl,
    boxShadow: theme.effects.shadow.card,
  };
};