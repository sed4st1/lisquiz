import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { colors, borderRadius, spacing } from '../theme/tokens';
import type { Player } from '../types/quiz';

export interface AvatarGridProps {
  players: Player[];
  maxDisplay?: number;
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
    gap: spacing.md,
    width: '100%',
    alignItems: 'start',
    boxSizing: 'border-box',
  },
  playerItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    width: '100%',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.cardSurface,
    border: '2px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    userSelect: 'none',
  },
  playerName: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    width: '100%',
    margin: 0,
    lineHeight: 1.2,
  },
  counterContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.cardSurfaceHover,
    border: `2px dashed ${colors.cardBorder}`,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  counterText: {
    color: colors.foxOrange,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '-0.3px',
  },
  counterLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.2,
  },
  emptyState: {
    width: '100%',
    padding: `${spacing.xl}px ${spacing.md}px`,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    backgroundColor: 'rgba(22, 32, 53, 0.4)',
    borderRadius: borderRadius.md,
    border: `1px dashed ${colors.cardBorder}`,
    boxSizing: 'border-box',
  },
};

const DEFAULT_AVATAR = '/assets/avatars/students/hedgehog.png';

const resolveAvatarSrc = (avatar?: string): string => {
  if (!avatar) return DEFAULT_AVATAR;
  if (avatar.startsWith('/') || avatar.startsWith('http')) return avatar;

  const cleanName = avatar.replace(/\.png$/i, '');
  // Teacher avatar check
  const teacherNames = ['badger', 'deer', 'cat', 'fox'];
  if (teacherNames.includes(cleanName)) {
    return `/assets/avatars/teachers/${cleanName}.png`;
  }
  // Default to student avatar folder
  return `/assets/avatars/students/${cleanName}.png`;
};

export default function AvatarGrid({ players, maxDisplay = 30 }: AvatarGridProps) {
  if (!players || players.length === 0) {
    return (
      <div style={styles.emptyState}>
        Ожидаем подключения игроков...
      </div>
    );
  }

  const displayedPlayers = players.slice(0, maxDisplay);
  const remainingCount = players.length - maxDisplay;

  return (
    <div style={styles.grid}>
      <AnimatePresence>
        {displayedPlayers.map((player, index) => {
          const avatarSrc = resolveAvatarSrc(player.avatar);

          return (
            <motion.div
              key={player.id || `player-${index}`}
              style={styles.playerItem}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                delay: index * 0.05,
                type: 'spring',
                stiffness: 350,
                damping: 22,
              }}
            >
              <div style={styles.avatarContainer}>
                <img
                  src={avatarSrc}
                  alt={player.display_name || 'Игрок'}
                  style={styles.avatarImg}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + DEFAULT_AVATAR) {
                      target.src = DEFAULT_AVATAR;
                    }
                  }}
                />
              </div>
              <span style={styles.playerName} title={player.display_name}>
                {player.display_name || 'Игрок'}
              </span>
            </motion.div>
          );
        })}

        {remainingCount > 0 && (
          <motion.div
            key="overflow-counter"
            style={styles.playerItem}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              delay: displayedPlayers.length * 0.05,
              type: 'spring',
              stiffness: 350,
              damping: 22,
            }}
          >
            <div style={styles.counterContainer}>
              <span style={styles.counterText}>+{remainingCount}</span>
            </div>
            <span style={styles.counterLabel}>ещё</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
