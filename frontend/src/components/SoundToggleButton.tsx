import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../services/soundManager';

interface SoundToggleButtonProps {
  variant?: 'pill' | 'round';
  size?: number;
  showLabel?: boolean;
}

export default function SoundToggleButton({
  variant = 'pill',
  size = 16,
  showLabel = true,
}: SoundToggleButtonProps) {
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getIsMuted());

  useEffect(() => {
    const unsub = soundManager.subscribeMute((muted) => {
      setIsMuted(muted);
    });
    return unsub;
  }, []);

  const handleToggle = () => {
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) {
      soundManager.playTap();
    }
  };

  if (variant === 'round') {
    return (
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleToggle}
        title={isMuted ? 'Включить звук' : 'Выключить звук'}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          backgroundColor: isMuted ? '#FFFDF9' : '#FFF5EA',
          border: isMuted ? '1.5px solid #E5C39E' : '2px solid #FFAF66',
          boxShadow: isMuted ? '0 2px 0 #D8BEA3' : '0 3px 0 #C95000, 0 3px 8px rgba(245, 107, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          outline: 'none',
          padding: 0,
          color: isMuted ? '#855F3F' : '#EA580C',
          transition: 'all 0.15s ease',
        }}
      >
        {isMuted ? <VolumeX size={size + 2} /> : <Volume2 size={size + 2} />}
      </motion.button>
    );
  }

  // Pill variant for top bar
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      title={isMuted ? 'Включить звук' : 'Выключить звук'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px',
        borderRadius: 999,
        backgroundColor: isMuted ? 'rgba(255, 255, 255, 0.06)' : 'rgba(16, 185, 129, 0.16)',
        border: isMuted ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(16, 185, 129, 0.4)',
        color: isMuted ? '#94A3B8' : '#34D399',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.18s ease',
      }}
    >
      {isMuted ? <VolumeX size={size} /> : <Volume2 size={size} />}
      {showLabel && (
        <span style={{ fontSize: 11 }}>{isMuted ? 'Звук: выкл' : 'Звук: вкл'}</span>
      )}
    </motion.button>
  );
}
