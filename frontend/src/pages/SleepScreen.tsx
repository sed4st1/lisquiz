import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sparkles, Home } from 'lucide-react';
import { TactileButton } from '../components/TactileButton';
import { haptics } from '../services/haptics';

interface SleepScreenProps {
  onWakeUp?: () => void;
  onGoHome?: () => void;
}

export default function SleepScreen({ onWakeUp, onGoHome }: SleepScreenProps) {
  const handleWake = () => {
    haptics.impact('medium');
    onWakeUp?.();
  };

  return (
    <div style={styles.container}>
      {/* Background with Sleeping Sprint on Mossy Stump */}
      <div style={styles.bgOverlay} />

      {/* Floating Z-z-z bubbles */}
      <div style={styles.zzzContainer}>
        {['Z', 'z', 'z', '✨'].map((char, i) => (
          <motion.span
            key={i}
            initial={{ y: 0, opacity: 0, x: 0 }}
            animate={{
              y: [-10, -60, -90],
              opacity: [0, 1, 0],
              x: [0, (i % 2 === 0 ? 15 : -15), (i % 2 === 0 ? 25 : -25)],
            }}
            transition={{
              repeat: Infinity,
              duration: 3,
              delay: i * 0.75,
              ease: 'easeOut',
            }}
            style={{
              ...styles.zzzText,
              fontSize: 16 + i * 4,
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Content Card at the bottom */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        style={styles.card}
      >
        <div style={styles.badgeRow}>
          <div style={styles.badge}>
            <Moon size={14} color="#818CF8" />
            <span>Время отдыха</span>
          </div>
          <div style={styles.badge}>
            <Sparkles size={14} color="#FBBF24" />
            <span>Роща засыпает</span>
          </div>
        </div>

        <h2 style={styles.title}>Спринт сладко спит 🦊💤</h2>
        <p style={styles.subtitle}>
          Все уроки и викторины на сегодня пройдены! Дерево Знаний напиталось энергией ваших ответов.
        </p>

        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statVal}>+1 250</span>
            <span style={styles.statLabel}>Очков за день</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statVal}>5 дней</span>
            <span style={styles.statLabel}>Серия побед 🔥</span>
          </div>
        </div>

        <div style={styles.actions}>
          <TactileButton
            theme="orange"
            size="lg"
            fullWidth
            onClick={handleWake}
          >
            Разбудить Спринта 🦊
          </TactileButton>

          {onGoHome && (
            <TactileButton
              theme="secondary"
              size="md"
              fullWidth
              onClick={onGoHome}
              iconBefore={<Home size={16} />}
            >
              В главное меню
            </TactileButton>
          )}
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100%',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    background: "url('/assets/backgrounds/sleep_screen.png') center bottom / cover no-repeat",
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(8, 13, 26, 0.2) 0%, rgba(8, 13, 26, 0.75) 100%)',
    pointerEvents: 'none',
  },
  zzzContainer: {
    position: 'absolute',
    top: '38%',
    right: '32%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  zzzText: {
    position: 'absolute',
    color: '#FDE047',
    fontWeight: 900,
    textShadow: '0 0 10px rgba(253, 224, 71, 0.8)',
  },
  card: {
    position: 'relative',
    zIndex: 2,
    margin: 14,
    padding: '20px 18px',
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 28,
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  badgeRow: {
    display: 'flex',
    gap: 8,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 11,
    color: '#E5E7EB',
    fontWeight: 600,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 1.4,
  },
  statsRow: {
    display: 'flex',
    gap: 10,
    margin: '4px 0',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: 15,
    fontWeight: 800,
    color: '#10B981',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
};
