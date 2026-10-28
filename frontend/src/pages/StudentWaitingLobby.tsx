import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hourglass, X, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';
import { socketService } from '../services/socketService';
import { roomApi } from '../services/roomApi';
import { haptics } from '../services/haptics';
import { soundManager } from '../services/soundManager';
import { LobbyBoardScene, LobbyStudent } from '../components/LobbyBoardScene';
import { HangingPinSign } from '../components/HangingPinSign';
import { StudentsCountPill } from '../components/StudentsCountPill';

interface StudentWaitingLobbyProps {
  roomCode: string;
  playerName: string;
  playerAvatar: string;
  subject?: string;
  grade?: number;
  onGameStart: () => void;
  onLeaveRoom: () => void;
}

export default function StudentWaitingLobby({
  roomCode,
  playerName,
  playerAvatar,
  subject = 'Математика',
  grade = 7,
  onGameStart,
  onLeaveRoom,
}: StudentWaitingLobbyProps) {
  const [roomSubject, setRoomSubject] = useState<string>(subject);
  const [roomGrade, setRoomGrade] = useState<number>(grade);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [gameJoinUrl, setGameJoinUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [players, setPlayers] = useState<LobbyStudent[]>(() => {
    const cached = socketService.getLastSyncState();
    if (cached && cached.players) {
      const list = Object.values(cached.players).map((p: any) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        division: p.division,
      }));
      if (list.length > 0) return list;
    }
    return [{ id: 'me', name: playerName, avatar: playerAvatar }];
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Listen for room updates
    if (roomCode) {
      roomApi.getRoomInfo(roomCode).then((info: any) => {
        if (!isMounted || !info) return;
        if (info.subject) setRoomSubject(info.subject);
        if (info.grade) setRoomGrade(info.grade);
      }).catch(() => {});
    }

    const handleSync = (data: any) => {
      if (!isMounted) return;
      if (data?.subject) setRoomSubject(data.subject);
      if (data?.grade) setRoomGrade(data.grade);
      if (data?.status === 'finished') {
        socketService.disconnect();
        onLeaveRoom();
        return;
      }
      if (data?.status === 'question' || data?.status === 'countdown') {
        onGameStart();
        return;
      }
      if (data && data.players) {
        const list: LobbyStudent[] = Object.values(data.players).map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          division: p.division,
        }));
        // Ensure student is in list
        const hasMe = list.some((p) => p.name === playerName);
        if (!hasMe && playerName) {
          list.unshift({ id: 'me', name: playerName, avatar: playerAvatar });
        }
        setPlayers(list);
      }
    };

    const handlePlayerJoined = (data: any) => {
      if (!isMounted) return;
      haptics.notification('success');
      soundManager.playKnock();
      setPlayers((prev) => {
        if (prev.some((p) => p.id === data.player_id)) return prev;
        return [...prev, { id: data.player_id, name: data.name, avatar: data.avatar, division: data.division }];
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
      soundManager.playKnock();

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
          if (isMounted) {
            soundManager.playKnock();
            setCountdown(cur);
          }
        }
      }, 1000);
    };

    socketService.on('ROOM_SYNC', handleSync);
    socketService.on('PLAYER_JOINED', handlePlayerJoined);
    socketService.on('PLAYER_LEFT', handlePlayerLeft);
    socketService.on('COUNTDOWN_START', handleCountdownStart);

    return () => {
      isMounted = false;
      socketService.off('ROOM_SYNC', handleSync);
      socketService.off('PLAYER_JOINED', handlePlayerJoined);
      socketService.off('PLAYER_LEFT', handlePlayerLeft);
      socketService.off('COUNTDOWN_START', handleCountdownStart);
    };
  }, [playerName, playerAvatar, onGameStart, onLeaveRoom]);

  // Generate real, scannable QR code matching game visual aesthetic
  useEffect(() => {
    const pin = roomCode || '482915';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lisquiz.ru';
    const url = `${origin}/?pin=${pin}`;
    setGameJoinUrl(url);

    QRCode.toDataURL(url, {
      width: 280,
      margin: 1,
      color: {
        dark: '#4A2306',
        light: '#FFFDF7',
      },
      errorCorrectionLevel: 'Q',
    })
      .then((dataUri) => setQrDataUrl(dataUri))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [roomCode]);

  const handleCopyLink = () => {
    if (!gameJoinUrl) return;
    haptics.notification('success');
    navigator.clipboard?.writeText(gameJoinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  // Identify my student ID in the list
  const myPlayer = players.find((p) => p.name === playerName || p.id === 'me');
  const myId = myPlayer?.id || 'me';

  return (
    <div style={styles.container}>
      {/* 1. Hanging Wooden PIN Sign (with integrated back/leave button and title) */}
      <div style={{ width: '100%', maxWidth: 540, display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 10 }}>
        <HangingPinSign
          pin={roomCode}
          subject={roomSubject}
          grade={roomGrade}
          onBack={onLeaveRoom}
          onOpenQr={() => setIsQrModalOpen(true)}
        />
      </div>

      {/* 2. Wooden Students Count Pill */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <StudentsCountPill count={players.length} max={25} />
      </div>

      {/* 3. Center Scene: Mossy Stump + Animated Sprint + 12-Slot Board */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 680, marginBottom: 14 }}>
        <LobbyBoardScene
          students={players}
          maxSlots={12}
          currentStudentId={myId}
          isTeacher={false}
        />
      </div>

      {/* 4. Cozy Waiting Card for Students */}
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={styles.waitingCard}
      >
        <div style={styles.pulseIndicator}>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0.2, 0.7] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={styles.pulseDot}
          />
          <Hourglass size={18} color="#D97706" />
        </div>

        <div>
          <div style={styles.waitingTitle}>Учитель скоро начнёт викторину!</div>
          <div style={styles.waitingDesc}>
            Приготовьтесь отвечать на вопросы быстрее всех
          </div>
        </div>
      </motion.div>

      {/* 5. Countdown Fullscreen Overlay */}
      {countdown !== null && (
        <div style={styles.countdownOverlay}>
          <motion.div
            key={countdown}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            style={styles.countdownNumber}
          >
            {countdown}
          </motion.div>
          <span style={styles.countdownLabel}>Приготовьтесь!</span>
        </div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalBackdrop}
            onClick={() => setIsQrModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              style={styles.qrModalCard}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.qrModalHeader}>
                <h3 style={styles.qrModalTitle}>Подключение по QR</h3>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  style={styles.closeBtn}
                >
                  <X size={18} color="#5C3317" />
                </button>
              </div>

              {/* Real Scannable QR Code */}
              <div style={styles.qrBox}>
                {qrDataUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={qrDataUrl}
                      alt="Game QR Code"
                      style={{
                        width: 210,
                        height: 210,
                        display: 'block',
                        borderRadius: 12,
                      }}
                    />
                    {/* Centered Oak Acorn Emblem Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 44,
                        height: 44,
                        backgroundColor: '#FFFDF7',
                        borderRadius: '50%',
                        border: '2.5px solid #4A2306',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 8px rgba(74, 35, 6, 0.25)',
                      }}
                    >
                      <img
                        src="/assets/icons/acorn.png"
                        alt="Acorn"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ width: 210, height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, color: '#78350F' }}>Генерация QR-кода...</span>
                  </div>
                )}
              </div>

              <div style={styles.qrPinDisplay}>
                PIN: <strong>{roomCode ? `${roomCode.slice(0, 3)} ${roomCode.slice(3, 6)}` : '482 915'}</strong>
              </div>

              {/* Direct Game Join Link with Copy Button */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: '#FDF6E2',
                  border: '1.5px solid #D97706',
                  borderRadius: 14,
                  padding: '8px 12px',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#78350F',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                    flex: 1,
                  }}
                >
                  {gameJoinUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    border: 'none',
                    backgroundColor: copiedLink ? '#10B981' : '#FF7A00',
                    color: '#FFF',
                    borderRadius: 8,
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                    transition: 'background-color 0.2s ease',
                  }}
                >
                  {copiedLink ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                  <span>{copiedLink ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>

              <p style={styles.qrInstructions}>
                Покажите QR-код однокласснику или отправьте ссылку, чтобы он присоединился к уроку
              </p>
            </motion.div>
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
    alignItems: 'center',
    padding: '10px 14px 40px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overflowX: 'hidden',
    backgroundColor: '#FAF5EE',
  },
  topNavBar: {
    width: '100%',
    maxWidth: 680,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    zIndex: 10,
  },
  leaveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid rgba(220, 38, 38, 0.25)',
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    outline: 'none',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  },
  titleCapsule: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid rgba(160, 110, 60, 0.22)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  },
  titleText: {
    fontSize: 13,
    fontWeight: 800,
    color: '#5C3317',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  waitingCard: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    border: '1.5px solid rgba(160, 110, 60, 0.22)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.06)',
    marginTop: 6,
  },
  pulseIndicator: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: '#FEF3C7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pulseDot: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: '#F59E0B',
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#5C3317',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  waitingDesc: {
    fontSize: 12,
    color: '#78350F',
    opacity: 0.8,
    marginTop: 2,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  countdownOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(250, 245, 238, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  countdownNumber: {
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: '110px',
    fontWeight: 900,
    color: '#FF7A00',
    textShadow: '0 8px 24px rgba(255, 122, 0, 0.4)',
  },
  countdownLabel: {
    fontSize: 22,
    fontWeight: 800,
    color: '#5C3317',
    marginTop: 10,
    letterSpacing: '0.05em',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  qrModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: '22px',
    maxWidth: 320,
    width: '100%',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  qrModalTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#5C3317',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBox: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FAF5EE',
    border: '2px solid rgba(160, 110, 60, 0.2)',
    marginBottom: 14,
  },
  qrPinDisplay: {
    fontSize: 18,
    fontWeight: 800,
    color: '#5C3317',
    marginBottom: 8,
  },
  qrInstructions: {
    fontSize: 12,
    color: '#78350F',
    margin: 0,
    lineHeight: 1.4,
    opacity: 0.85,
  },
};
