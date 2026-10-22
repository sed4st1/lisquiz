import React from 'react';
import { haptics, HapticImpact } from '../services/haptics';

export type ButtonTheme = 'orange' | 'green' | 'blue' | 'yellow' | 'red' | 'wood' | 'secondary';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  theme?: ButtonTheme;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  hapticStyle?: HapticImpact;
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
}

const THEME_STYLES: Record<ButtonTheme, { edge: string; front: string; highlight: string; textColor: string }> = {
  orange: {
    edge: '#C95E00',
    front: '#FF7A00',
    highlight: 'rgba(255, 175, 77, 0.45)',
    textColor: '#FFFFFF',
  },
  green: {
    edge: '#059669',
    front: '#10B981',
    highlight: 'rgba(110, 231, 183, 0.45)',
    textColor: '#FFFFFF',
  },
  blue: {
    edge: '#1D4ED8',
    front: '#3B82F6',
    highlight: 'rgba(147, 197, 253, 0.45)',
    textColor: '#FFFFFF',
  },
  yellow: {
    edge: '#D97706',
    front: '#F59E0B',
    highlight: 'rgba(252, 211, 77, 0.45)',
    textColor: '#FFFFFF',
  },
  red: {
    edge: '#DC2626',
    front: '#EF4444',
    highlight: 'rgba(252, 165, 165, 0.45)',
    textColor: '#FFFFFF',
  },
  wood: {
    edge: '#6E4516',
    front: '#A7692B',
    highlight: 'rgba(217, 167, 110, 0.45)',
    textColor: '#FFF7ED',
  },
  secondary: {
    edge: '#0F172A',
    front: '#1E293B',
    highlight: 'rgba(255, 255, 255, 0.1)',
    textColor: '#E2E8F0',
  },
};

const SIZE_STYLES = {
  sm: { py: 8, px: 14, fontSize: 13, radius: 12, depth: 3 },
  md: { py: 12, px: 20, fontSize: 15, radius: 16, depth: 4 },
  lg: { py: 16, px: 24, fontSize: 17, radius: 18, depth: 5 },
};

export const TactileButton: React.FC<TactileButtonProps> = ({
  children,
  theme = 'orange',
  size = 'md',
  fullWidth = false,
  hapticStyle = 'light',
  iconBefore,
  iconAfter,
  disabled = false,
  className = '',
  onClick,
  style,
  ...props
}) => {
  const currentTheme = THEME_STYLES[theme];
  const sizeConfig = SIZE_STYLES[size];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    haptics.impact(hapticStyle);
    onClick?.(e);
  };

  return (
    <button
      {...props}
      disabled={disabled}
      onClick={handleClick}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        position: 'relative',
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        border: 'none',
        background: 'transparent',
        padding: 0,
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none',
        transition: 'transform 0.08s ease-out',
        ...style,
      }}
      className={`tactile-btn-root ${className}`}
    >
      {/* Слой 1: Размытая рассеянная контактная тень */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${sizeConfig.depth + 2}px)`,
          borderRadius: sizeConfig.radius,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          filter: 'blur(1px)',
          transition: 'transform 0.08s ease-out',
        }}
      />

      {/* Слой 2: Жесткое скошенное 3D-ребро (Beveled Edge) */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translateY(${sizeConfig.depth}px)`,
          borderRadius: sizeConfig.radius,
          backgroundColor: currentTheme.edge,
          transition: 'transform 0.08s ease-out',
        }}
      />

      {/* Слой 3: Лицевая панель с механикой физического продавливания (Squish) */}
      <span
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          gap: 8,
          borderRadius: sizeConfig.radius,
          padding: `${sizeConfig.py}px ${sizeConfig.px}px`,
          fontSize: sizeConfig.fontSize,
          fontWeight: 800,
          letterSpacing: '0.02em',
          backgroundColor: currentTheme.front,
          color: currentTheme.textColor,
          borderTop: `2px solid ${currentTheme.highlight}`,
          willChange: 'transform',
          transition: 'transform 0.06s ease-out, filter 0.06s ease-out',
        }}
        className="tactile-btn-front"
      >
        {iconBefore && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{iconBefore}</span>}
        <span>{children}</span>
        {iconAfter && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{iconAfter}</span>}
      </span>
    </button>
  );
};

export default TactileButton;
