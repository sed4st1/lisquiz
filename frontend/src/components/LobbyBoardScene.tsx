import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SprintLobbyRig } from './SprintLobbyRig';

export type DivisionType = 'sprout_keepers' | 'forest_guardians' | 'council_of_groves';

export interface LobbyStudent {
  id: string;
  name: string;
  avatar: string;
  division?: DivisionType;
  score?: number;
}

interface LobbyBoardSceneProps {
  students: LobbyStudent[];
  maxSlots?: number;
  onStudentClick?: (student: LobbyStudent) => void;
  currentStudentId?: string;
  isTeacher?: boolean;
}

const AVATAR_MAP: Record<string, string> = {
  bear: '/assets/avatars/students/bear.png',
  bunny: '/assets/avatars/students/bunny.png',
  hedgehog: '/assets/avatars/students/hedgehog.png',
  owl: '/assets/avatars/students/owl.png',
  raccoon: '/assets/avatars/students/raccoon.png',
  squirrel: '/assets/avatars/students/squirrel.png',
  fox_smart: '/assets/avatars/students/raccoon.png',
  fox_1: '/assets/avatars/students/raccoon.png',
  fox_happy: '/assets/avatars/students/raccoon.png',
  fox_detective: '/assets/avatars/students/raccoon.png',
};

const getAvatarSrc = (avatarKey?: string) => {
  if (!avatarKey) return AVATAR_MAP.bear;
  if (avatarKey.startsWith('/') || avatarKey.startsWith('http')) return avatarKey;
  return AVATAR_MAP[avatarKey] || AVATAR_MAP.bear;
};

export const getDivisionFrame = (student?: LobbyStudent | null, index: number = 0): string => {
  if (!student) return '/assets/frames/frame_sprout_keepers.png';
  if (student.division === 'council_of_groves') return '/assets/frames/frame_council_of_groves.png';
  if (student.division === 'forest_guardians') return '/assets/frames/frame_forest_guardians.png';
  if (student.division === 'sprout_keepers') return '/assets/frames/frame_sprout_keepers.png';

  // Natural distribution across the 3 divisions by index
  const dIdx = index % 3;
  if (dIdx === 2) return '/assets/frames/frame_council_of_groves.png';
  if (dIdx === 1) return '/assets/frames/frame_forest_guardians.png';
  return '/assets/frames/frame_sprout_keepers.png';
};

// 4 columns (cx: 255, 525, 795, 1065 out of 1313px)
const COL_PERCENTAGES = [19.42, 39.98, 60.55, 81.11];

// 3 rows: circle centers (cy: 495, 735, 995 out of 1198px)
const ROW_CIRCLE_PERCENTAGES = [41.32, 61.35, 83.05];

// 3 rows: wooden nameplate centers (py: 598, 838, 1098 out of 1198px)
const ROW_PILL_PERCENTAGES = [49.92, 69.95, 91.65];

export const LobbyBoardScene: React.FC<LobbyBoardSceneProps> = ({
  students,
  maxSlots = 12,
  onStudentClick,
  currentStudentId,
  isTeacher = false,
}) => {
  // Build a fixed 12-slot array
  const slots: Array<LobbyStudent | null> = Array.from({ length: maxSlots }, (_, i) => students[i] || null);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 680,
        margin: '0 auto',
        aspectRatio: '1313 / 1198',
        userSelect: 'none',
        overflow: 'visible',
      }}
    >
      {/* 1. Base Scene: Mossy Stump + Books + Signpost + Clean 12-Slot Board */}
      <img
        src="/assets/lobby/lobby_scene_stump_board.png"
        alt="Lobby Scene Stump and Board"
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

      {/* 2. Animated Mascot Sprint on top of Stump (Puppet Rig) */}
      <div
        style={{
          position: 'absolute',
          left: '51.4%',
          top: '-15.5%',
          width: '32.7%',
          transform: 'translateX(-50%)',
          zIndex: 4,
          pointerEvents: 'auto',
          overflow: 'visible',
        }}
      >
        <SprintLobbyRig width="100%" interactive={true} />
      </div>

      {/* 3. Dynamic 12 Student Slots */}
      {slots.map((student, index) => {
        const colIdx = index % 4;
        const rowIdx = Math.floor(index / 4);
        const cx = COL_PERCENTAGES[colIdx];
        const cy = ROW_CIRCLE_PERCENTAGES[rowIdx];
        const py = ROW_PILL_PERCENTAGES[rowIdx];

        const isMe = student && student.id === currentStudentId;
        const divisionFrameSrc = getDivisionFrame(student, index);

        return (
          <React.Fragment key={`slot-${index}`}>
            {/* Circular Avatar + Division Frame Region */}
            <div
              style={{
                position: 'absolute',
                left: `${cx}%`,
                top: `${cy}%`,
                width: '16.2%',
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AnimatePresence mode="wait">
                {student ? (
                  <motion.div
                    key={`student-avatar-${student.id}`}
                    initial={{ scale: 0, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 22,
                    }}
                    whileHover={onStudentClick ? { scale: 1.08 } : undefined}
                    whileTap={onStudentClick ? { scale: 0.94 } : undefined}
                    onClick={() => onStudentClick?.(student)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      cursor: onStudentClick ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={isTeacher ? `Нажмите, чтобы исключить ${student.name}` : student.name}
                  >
                    {/* Layer 0: Parchment circular background to cleanly cover dashed + slot */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '70%',
                        height: '70%',
                        borderRadius: '50%',
                        backgroundColor: '#F9F5EC',
                        zIndex: 0,
                      }}
                    />

                    {/* Layer 1: Circular Avatar Image in Center */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '64%',
                        height: '64%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        zIndex: 1,
                        boxShadow: isMe ? '0 0 10px rgba(255, 122, 0, 0.9)' : 'none',
                      }}
                    >
                      <img
                        src={getAvatarSrc(student.avatar)}
                        alt={student.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>

                    {/* Layer 2: Division Frame Placed Over Avatar Hole */}
                    <img
                      src={divisionFrameSrc}
                      alt="Division Frame"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        zIndex: 2,
                        filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.18))',
                      }}
                    />

                    {/* Online status green dot */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '22%',
                        right: '22%',
                        width: '18%',
                        height: '18%',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        border: '2px solid #FFFFFF',
                        boxShadow: '0 0 6px rgba(16, 185, 129, 0.75)',
                        zIndex: 4,
                      }}
                    />

                    {/* 'ВЫ' badge for current student */}
                    {isMe && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: '#FF7A00',
                          color: '#FFFFFF',
                          fontSize: '8px',
                          fontWeight: 900,
                          padding: '1px 5px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          zIndex: 5,
                        }}
                      >
                        ВЫ
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Wooden Name Plate Region */}
            <div
              style={{
                position: 'absolute',
                left: `${cx}%`,
                top: `${py}%`,
                width: '14.4%',
                height: '4.2%',
                transform: 'translate(-50%, -50%)',
                zIndex: 11,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: student && onStudentClick ? 'auto' : 'none',
                cursor: student && onStudentClick ? 'pointer' : 'default',
              }}
              onClick={() => student && onStudentClick?.(student)}
            >
              <AnimatePresence mode="wait">
                {student ? (
                  <motion.div
                    key={`name-${student.id}`}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Blank Wooden Nameplate Pill Texture */}
                    <img
                      src="/assets/lobby/nameplate_pill.png"
                      alt="Nameplate"
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

                    {/* Engraved Student Name */}
                    <span
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontSize: 'clamp(8.5px, 1.05vw, 11px)',
                        fontWeight: 800,
                        color: isMe ? '#9A3412' : '#4A2306',
                        textShadow: '0 1px 0 rgba(255, 255, 255, 0.75)',
                        letterSpacing: '0.01em',
                        padding: '0 2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '94%',
                        textAlign: 'center',
                      }}
                    >
                      {student.name}
                    </span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default LobbyBoardScene;
