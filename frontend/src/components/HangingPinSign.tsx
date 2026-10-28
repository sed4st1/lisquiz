import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { haptics } from '../services/haptics';

interface HangingPinSignProps {
  pin: string;
  onCopy?: () => void;
  onOpenQr?: () => void;
  onBack?: () => void;
  subject?: string;
  grade?: number;
  className?: string;
}

export const HangingPinSign: React.FC<HangingPinSignProps> = ({
  pin,
  onCopy,
  onOpenQr,
  onBack,
  subject = 'Математика',
  grade = 7,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  // If pin is empty or default, use canonical '482 915'
  const cleanPin = !pin || pin === '482915' || pin === '482 915' ? '482 915' : pin;

  const formattedPin = cleanPin.length === 6 && !cleanPin.includes(' ')
    ? `${cleanPin.slice(0, 3)} ${cleanPin.slice(3, 6)}`
    : cleanPin;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const copyVal = cleanPin.replace(/\s+/g, '');
    haptics.notification('success');
    navigator.clipboard?.writeText(copyVal);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2200);
  };

  const handleQrClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact('light');
    onOpenQr?.();
  };

  const handleBackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.impact('light');
    onBack?.();
  };

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 540,
        margin: '0 auto',
        aspectRatio: '831 / 390',
        userSelect: 'none',
      }}
      className={className}
    >
      {/* 1. Complete Hanging Wooden Sign (Top plank + ropes + PIN board + buttons + leaves) */}
      <img
        src="/assets/lobby/sign_pin_header.png"
        alt="PIN Code Sign"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 2. Top Plank: Clickable Back Button Hitbox */}
      {onBack && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={handleBackClick}
          style={{
            position: 'absolute',
            left: '11.4%',
            top: '15.3%',
            width: '11%',
            height: '21%',
            transform: 'translate(-50%, -50%)',
            zIndex: 12,
            background: 'transparent',
            border: 'none',
            borderRadius: 16,
            cursor: 'pointer',
            outline: 'none',
          }}
          aria-label="Назад"
          title="Вернуться к созданию викторин"
        />
      )}

      {/* 3. Top Plank: Dynamic Subject & Class Title (Cleanly fitted on wood grain) */}
      <div
        style={{
          position: 'absolute',
          left: '46.6%',
          top: '15.4%',
          transform: 'translate(-50%, -50%)',
          zIndex: 7,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '56%',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize:
              (`${subject} • ${typeof grade === 'string' ? grade : `${grade}А класс`}`).length > 24
                ? 'clamp(9.5px, 1.7vw, 12px)'
                : (`${subject} • ${typeof grade === 'string' ? grade : `${grade}А класс`}`).length > 18
                ? 'clamp(11px, 1.95vw, 13.5px)'
                : (`${subject} • ${typeof grade === 'string' ? grade : `${grade}А класс`}`).length > 14
                ? 'clamp(12px, 2.2vw, 15.5px)'
                : 'clamp(13px, 2.4vw, 17.5px)',
            fontWeight: 800,
            color: '#4A2306',
            letterSpacing: '0.01em',
            textShadow: '0 1px 0 rgba(255, 255, 255, 0.6)',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {subject} • {typeof grade === 'string' ? grade : `${grade}А класс`}
        </span>
      </div>

      {/* 4. Large Engraved 3D PIN Digits */}
      <div
        style={{
          position: 'absolute',
          top: '57.7%',
          left: '49.9%',
          transform: 'translate(-50%, -50%)',
          zIndex: 6,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: "'SF Mono', 'Fira Code', 'Roboto Mono', monospace",
            fontSize: 'clamp(28px, 6vw, 44px)',
            fontWeight: 900,
            color: '#4A2306',
            letterSpacing: '0.14em',
            textShadow: '0 2px 0 rgba(255, 255, 255, 0.75), 0 -1px 2px rgba(0, 0, 0, 0.35)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {formattedPin}
        </span>
      </div>

      {/* 5. Clickable 'Скопировать код' Hit Area (Bounded to carved button) */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={handleCopy}
        style={{
          position: 'absolute',
          left: '48.7%',
          top: '87.7%',
          width: '42%',
          height: '21%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          outline: 'none',
        }}
        aria-label="Скопировать PIN"
        title="Нажмите, чтобы скопировать код"
      >
        <AnimatePresence>
          {copied && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#DCFCE7',
                border: '1.5px solid #22C55E',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
              }}
            >
              <Check size={14} color="#15803D" strokeWidth={3} />
              <span
                style={{
                  fontSize: 'clamp(10px, 1.4vw, 13px)',
                  fontWeight: 800,
                  color: '#15803D',
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                Скопировано!
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* 6. Clickable QR Code Hit Area (Bounded to square carved button on bottom right) */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleQrClick}
        onTouchEnd={(e) => {
          e.stopPropagation();
          handleQrClick(e as unknown as React.MouseEvent);
        }}
        style={{
          position: 'absolute',
          left: '87.5%',
          top: '86.5%',
          width: '22%',
          height: '28%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          background: 'transparent',
          border: 'none',
          borderRadius: 14,
          cursor: 'pointer',
          outline: 'none',
          pointerEvents: 'auto',
          touchAction: 'manipulation',
        }}
        aria-label="Показать QR-код"
        title="Показать QR-код для подключения"
      />
    </motion.div>
  );
};

export default HangingPinSign;
