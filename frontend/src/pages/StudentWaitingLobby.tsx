import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Sparkles, Clock, LogOut } from 'lucide-react';
import { socketService } from '../services/socketService';
import { haptics } from '../services/haptics';

interface StudentWaitingLobbyProps {
  roomCode: string;
  playerName: string;
  playerAvatar: string;
  onGameStart: () => void;
  onLeaveRoom: () => void;
}

const AVATAR_MAP: Record<string, string> = {
  bear: '/assets/avatars/students/bear.png',
  bunny: '/assets/avatars/students/bunny.png',
  hedgehog: '/assets/avatars/students/hedgehog.png',
  owl: '/assets/avatars/students/owl.png',
  raccoon: '/assets/avatars/students/raccoon.png',
  squirrel: '/assets/avatars/students/squirrel.png',
  fox_smart: '/assets/avatars/students/raccoon.png',
};

export default function StudentWaitingLobby({
  roomCode,
  playerName,
  playerAvatar,
  onGameStart,
  onLeaveRoom,
}: StudentWaitingLobbyProps) {
  const [players, setPlayers] = useState<Array<{ id: string; name: string; avatar: string }>>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Listen for room updates
    const handleSync = (data: any) => {
      if (!isMounted) return;
      if (data && data.players) {
        const list = Object.values(data.players).map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
        }));
        setPlayers(list);
      }
    };

    const handlePlayerJoined = (data: any) => {
      if (!isMounted) return;
      haptics.notification('success');
      setPlayers((prev) => {
        if (prev.some((p) => p.id === data.player_id)) return prev;
        return [...prev, { id: data.player_id, name: data.name, avatar: data.avatar }];
      });
    };

    const handlePlayerLeft = (data: any) => {
      if (!isMounted) return;
      setPlayers((prev) => prev.filter((p) => p.id !== data.player_id));
    };

    const handleCountdownStart = (data: any) => {
      if (!isMounted) return;
      const sec = data.countdown_sec || 3;
      setCountdown(sec);

      let cur = sec;
      const timer = setInterval(() => {
        cur -= 1;
        if (cur <= 0) {
          clearInterval(timer);
          if (isMounted) {
            setCountdown(null);
            onGameStart();
          }
        } else {
          if (isMounted) setCountdown(cur);
        }
      }, 1000);
    };

    const handleKickOrExit = () => {
      if (!isMounted) return;
      socketService.disconnect();
      onLeaveRoom();
    };

    const handleDisconnect = (data: any) => {
      if (!isMounted) return;
      // Only kick student if room was explicitly deleted/finished on backend (code 4004)
      if (data?.code === 4004) {
        socketService.disconnect();
        onLeaveRoom();
      }
    };

    // Auto-detect if room ceases to exist on the server (only if WS is disconnected)
    let consecutive404Count = 0;
    const roomPollInterval = setInterval(async () => {
      if (!isMounted) return;
      if (socketService.isConnected()) {
        consecutive404Count = 0;
        return;
      }
      try {
        const res = await fetch(`/api/rooms/${roomCode}`);
        if (res.status === 404) {
          consecutive404Count += 1;
          if (consecutive404Count >= 2) {
            clearInterval(roomPollInterval);
            socketService.disconnect();
            onLeaveRoom();
          }
        } else if (res.ok) {
          consecutive404Count = 0;
        }
      } catch {
        // Do not kick on temporary network/fetch hiccups
      }
    }, 3000);

    socketService.on('SYNC_STATE', handleSync);
    socketService.on('PLAYER_JOINED', handlePlayerJoined);
    socketService.on('PLAYER_LEFT', handlePlayerLeft);
    socketService.on('COUNTDOWN_START', handleCountdownStart);
    socketService.on('DISCONNECT', handleDisconnect);
    socketService.on('KICKED', handleKickOrExit);
    socketService.on('ROOM_CLOSED', handleKickOrExit);
    socketService.on('TEACHER_LEFT', handleKickOrExit);

    return () => {
      isMounted = false;
      clearInterval(roomPollInterval);
      socketService.off('SYNC_STATE', handleSync);
      socketService.off('PLAYER_JOINED', handlePlayerJoined);
      socketService.off('PLAYER_LEFT', handlePlayerLeft);
      socketService.off('COUNTDOWN_START', handleCountdownStart);
      socketService.off('DISCONNECT', handleDisconnect);
      socketService.off('KICKED', handleKickOrExit);
      socketService.off('ROOM_CLOSED', handleKickOrExit);
      socketService.off('TEACHER_LEFT', handleKickOrExit);
    };
  }, [onGameStart]);

  const getAvatarSrc = (av: string) => {
    if (av.startsWith('/')) return av;
    return AVATAR_MAP[av] || AVATAR_MAP.raccoon;
  };

  const handleLeave = () => {
    haptics.impact('light');
    try {
      socketService.send('LEAVE_ROOM', { room_code: roomCode });
    } catch {}
    socketService.disconnect();
    onLeaveRoom();
  };

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.roomTag}>Комната: {roomCode}</span>
        </div>

        <button onClick={handleLeave} style={styles.leaveBtn} title="Выйти из комнаты">
          <LogOut size={16} color="#94A3B8" />
          <span>Выйти</span>
        </button>
      </header>

      {/* Hero Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.heroCard}
      >
        <div style={styles.avatarWrap}>
          <img
            src={getAvatarSrc(playerAvatar)}
            alt={playerName}
            style={styles.heroAvatarImg}
          />
        </div>

        <h2 style={styles.heroTitle}>Ты в игре, {playerName}!</h2>
        <p style={styles.heroSub}>
          Учитель скоро запустит викторину. Приготовься отвечать быстро и точно!
        </p>

        <div style={styles.statusPill}>
          <Clock size={15} color="#34D399" />
          <span>Ожидание старта учителем</span>
        </div>
      </motion.div>

      {/* Classmates Grid */}
      <div style={styles.classmatesSection}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitleRow}>
            <Users size={16} color="#F59E0B" />
            <span style={styles.sectionTitle}>Твои одноклассники в комнате</span>
          </div>
          <span style={styles.countBadge}>{players.length || 1} в игре</span>
        </div>

        <div style={styles.playersGrid}>
          {players.map((p) => {
            const isMe = p.name === playerName;
            return (
              <motion.div
                key={p.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  ...styles.playerItem,
                  backgroundColor: isMe ? '#064E3B' : '#1E293B',
                }}
              >
                <div style={styles.playerAvatarCircle}>
                  <img
                    src={getAvatarSrc(p.avatar)}
                    alt={p.name}
                    style={styles.playerAvatarImg}
                  />
                </div>
                <span
                  style={{
                    ...styles.playerName,
                    color: isMe ? '#34D399' : '#FFFFFF',
                    fontWeight: isMe ? 800 : 600,
                  }}
                >
                  {p.name} {isMe ? '(Ты)' : ''}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mascot Sprint Tip */}
      <div style={styles.tipCard}>
        <Sparkles size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
        <span style={styles.tipText}>
          Подсказка Спринта: чем быстрее и точнее ты отвечаешь, тем больше очков принесешь в копилку Рощи класса!
        </span>
      </div>

      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.countdownOverlay}
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              style={styles.countdownNumber}
            >
              {countdown}
            </motion.div>
            <span style={styles.countdownLabel}>Внимание, старт!</span>
          </motion.div>
        )}
      </AnimatePresence>
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
    backgroundColor: 'transparent',
    padding: '14px 16px 80px',
    boxSizing: 'border-box',
    gap: 14,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  roomTag: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FCD34D',
    backgroundColor: '#1E293B',
    borderRadius: 999,
    padding: '4px 12px',
  },
  leaveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    border: 'none',
    borderRadius: 999,
    padding: '6px 12px',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  heroCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 22,
    padding: '20px 16px',
    gap: 10,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: '50%',
    backgroundColor: '#0F172A',
    border: '2.5px solid #10B981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroAvatarImg: {
    width: '85%',
    height: '85%',
    objectFit: 'contain',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: '#FFFFFF',
    margin: 0,
  },
  heroSub: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 1.4,
    maxWidth: 280,
    margin: 0,
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    borderRadius: 999,
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: 800,
    color: '#6EE7B7',
    marginTop: 4,
  },
  classmatesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  countBadge: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 700,
  },
  playersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
  },
  playerItem: {
    borderRadius: 14,
    padding: '8px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  playerAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    backgroundColor: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarImg: {
    width: '80%',
    height: '80%',
    objectFit: 'contain',
  },
  playerName: {
    fontSize: 10.5,
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 80,
  },
  tipCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: '10px 14px',
  },
  tipText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    lineHeight: 1.35,
    fontWeight: 500,
  },
  countdownOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  countdownNumber: {
    fontSize: 88,
    fontWeight: 900,
    color: '#FCD34D',
    lineHeight: 1,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
  },
};
