import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, BookOpen, RotateCw, CheckCircle, HelpCircle } from 'lucide-react';
import { groveApi, KnowledgeCard, StudentInventory, CardPullResult } from '../services/groveApi';
import { haptics } from '../services/haptics';

interface KnowledgeCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  onAcornsChange?: (newBalance: number) => void;
}

const RARITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  common: { label: 'Обычная', color: '#CBD5E1', bg: '#1E293B' },
  rare: { label: 'Редкая', color: '#38BDF8', bg: '#0369A1' },
  epic: { label: 'Эпическая', color: '#C084FC', bg: '#7E22CE' },
  legendary: { label: 'Легендарная', color: '#FCD34D', bg: '#B45309' },
};

export default function KnowledgeCardsModal({
  isOpen,
  onClose,
  studentId = 'std_ivan',
  onAcornsChange,
}: KnowledgeCardsModalProps) {
  const [inventory, setInventory] = useState<StudentInventory | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pulledResult, setPulledResult] = useState<CardPullResult | null>(null);
  const [selectedCard, setSelectedCard] = useState<KnowledgeCard | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInventory = async () => {
    try {
      const data = await groveApi.getStudentInventory(studentId);
      setInventory(data);
      if (onAcornsChange) onAcornsChange(data.acorns_balance);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      setPulledResult(null);
      setSelectedCard(null);
      setErrorMsg(null);
    }
  }, [isOpen, studentId]);

  const handlePullCard = async () => {
    if (isPulling) return;
    haptics.impact('medium');
    setErrorMsg(null);
    setIsPulling(true);

    try {
      const result = await groveApi.pullCard(studentId, 50);
      setPulledResult(result);
      if (onAcornsChange) onAcornsChange(result.remaining_acorns);
      await fetchInventory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Не удалось открыть карточку');
    } finally {
      setIsPulling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.backdrop}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={styles.modalCard}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconCircle}>
              <BookOpen size={20} color="#F59E0B" />
            </div>
            <div>
              <h2 style={styles.title}>Карточки Знаний</h2>
              <p style={styles.subtitle}>Коллекция микрофактов великих ученых</p>
            </div>
          </div>

          <button onClick={onClose} style={styles.closeBtn} title="Закрыть">
            <X size={20} color="#94A3B8" />
          </button>
        </div>

        {/* Currency & Pity Bar */}
        <div style={styles.acornsCapsule}>
          <div style={styles.acornBalance}>
            <img
              src="/assets/icons/acorn_gold.png"
              alt="Желудь"
              style={{ width: 22, height: 22, objectFit: 'contain' }}
            />
            <span style={styles.acornCountText}>
              {inventory?.acorns_balance ?? 0} желудей
            </span>
          </div>

          <div style={styles.collectionCountBadge}>
            <Sparkles size={14} color="#34D399" />
            <span>{inventory?.collection_progress ?? '0/16'}</span>
          </div>
        </div>

        {errorMsg && (
          <div style={styles.errorBanner}>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pull Card Showcase / Action */}
        <div style={styles.pullSection}>
          <div style={styles.pullInfoRow}>
            <div style={styles.pullPityCol}>
              <span style={styles.pityLabel}>Софт гарант на Эпическую: 10 круток</span>
              <span style={styles.pityLabel}>Хард гарант на Легендарную: 30 круток</span>
              <span style={styles.pityHint}>Без доната. При дубликате возврат 25 желудей</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              disabled={isPulling || (inventory ? inventory.acorns_balance < 50 : false)}
              onClick={handlePullCard}
              style={{
                ...styles.pullButton,
                opacity: (inventory && inventory.acorns_balance < 50) || isPulling ? 0.6 : 1,
              }}
            >
              {isPulling ? (
                <>
                  <RotateCw size={18} className="animate-spin" />
                  <span>Открываем...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} color="#FFFFFF" />
                  <span>Открыть карточку (50 🌰)</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Pulled Card Result Popup / Card Reveal */}
        <AnimatePresence>
          {pulledResult && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={styles.pulledCardResultWrap}
            >
              <div
                style={{
                  ...styles.singleCardPlate,
                  backgroundColor: RARITY_LABELS[pulledResult.card.rarity]?.bg || '#1E293B',
                }}
              >
                <div style={styles.cardHeaderRow}>
                  <span
                    style={{
                      ...styles.rarityBadge,
                      color: RARITY_LABELS[pulledResult.card.rarity]?.color || '#FFFFFF',
                    }}
                  >
                    {RARITY_LABELS[pulledResult.card.rarity]?.label}
                  </span>
                  <span style={styles.cardSubject}>{pulledResult.card.subject}</span>
                </div>

                <h3 style={styles.cardBigTitle}>{pulledResult.card.card_name}</h3>

                <p style={styles.cardFactText}>{pulledResult.card.lore_microfact}</p>

                {pulledResult.is_duplicate ? (
                  <div style={styles.duplicateNotice}>
                    <CheckCircle size={15} color="#F59E0B" />
                    <span>Повторка! Начислено +25 желудей кэшбэка</span>
                  </div>
                ) : (
                  <div style={styles.newCardNotice}>
                    <Sparkles size={15} color="#34D399" />
                    <span>Новая карточка в твоей коллекции!</span>
                  </div>
                )}

                <button
                  onClick={() => setPulledResult(null)}
                  style={styles.collectBtn}
                >
                  В коллекцию
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collection Album Grid */}
        <div style={styles.albumSection}>
          <div style={styles.albumHeader}>
            <span style={styles.albumTitle}>Твой научный альбом</span>
            <span style={styles.albumCount}>
              {inventory?.unique_cards_count ?? 0} из {inventory?.catalog_total ?? 16}
            </span>
          </div>

          <div style={styles.cardsGrid}>
            {inventory?.cards.map((card) => {
              const rarityInfo = RARITY_LABELS[card.rarity] || RARITY_LABELS.common;
              return (
                <motion.div
                  key={card.card_id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedCard(card)}
                  style={{
                    ...styles.gridCardItem,
                    backgroundColor: rarityInfo.bg,
                  }}
                >
                  <div style={styles.gridCardTop}>
                    <span style={{ ...styles.gridRarityTag, color: rarityInfo.color }}>
                      {rarityInfo.label}
                    </span>
                    {(card.count ?? 1) > 1 && (
                      <span style={styles.gridCountBadge}>x{card.count}</span>
                    )}
                  </div>

                  <span style={styles.gridCardName}>{card.card_name}</span>
                  <span style={styles.gridCardSubj}>{card.subject}</span>
                </motion.div>
              );
            })}

            {/* Empty slots for cards not yet collected */}
            {inventory &&
              Array.from({
                length: Math.max(0, (inventory.catalog_total || 16) - inventory.cards.length),
              }).map((_, idx) => (
                <div key={`empty-${idx}`} style={styles.gridCardEmpty}>
                  <HelpCircle size={22} color="#475569" />
                  <span style={styles.emptyCardText}>Не открыта</span>
                </div>
              ))}
          </div>
        </div>

        {/* Card Detail Modal */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              style={styles.detailBackdrop}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  ...styles.detailCardPlate,
                  backgroundColor: RARITY_LABELS[selectedCard.rarity]?.bg || '#1E293B',
                }}
              >
                <div style={styles.cardHeaderRow}>
                  <span
                    style={{
                      ...styles.rarityBadge,
                      color: RARITY_LABELS[selectedCard.rarity]?.color,
                    }}
                  >
                    {RARITY_LABELS[selectedCard.rarity]?.label}
                  </span>
                  <span style={styles.cardSubject}>{selectedCard.subject}</span>
                </div>

                <h3 style={styles.cardBigTitle}>{selectedCard.card_name}</h3>
                <p style={styles.cardFactText}>{selectedCard.lore_microfact}</p>

                <button
                  onClick={() => setSelectedCard(null)}
                  style={styles.collectBtn}
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    boxSizing: 'border-box',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90vh',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 18,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: '#FFFFFF',
    margin: 0,
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    margin: 0,
    marginTop: 2,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acornsCapsule: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: '10px 14px',
    marginBottom: 14,
  },
  acornBalance: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  acornCountText: {
    fontSize: 15,
    fontWeight: 800,
    color: '#FCD34D',
  },
  collectionCountBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064E3B',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
    color: '#6EE7B7',
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderRadius: 12,
    padding: '8px 12px',
    color: '#FECACA',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 12,
    textAlign: 'center',
  },
  pullSection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  pullInfoRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  pullPityCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  pityLabel: {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#CBD5E1',
  },
  pityHint: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  pullButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    border: 'none',
    borderRadius: 14,
    padding: '12px 16px',
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
    cursor: 'pointer',
    touchAction: 'manipulation',
  },
  pulledCardResultWrap: {
    marginBottom: 16,
  },
  singleCardPlate: {
    borderRadius: 18,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  cardHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rarityBadge: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  cardSubject: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: 600,
  },
  cardBigTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: '#FFFFFF',
    margin: 0,
  },
  cardFactText: {
    fontSize: 12.5,
    color: '#F1F5F9',
    lineHeight: 1.45,
    margin: 0,
  },
  duplicateNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 11,
    color: '#FDE68A',
    fontWeight: 700,
  },
  newCardNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 11,
    color: '#A7F3D0',
    fontWeight: 700,
  },
  collectBtn: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    border: 'none',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    marginTop: 4,
  },
  albumSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  albumHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  albumTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  albumCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 600,
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
  },
  gridCardItem: {
    borderRadius: 14,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    cursor: 'pointer',
  },
  gridCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridRarityTag: {
    fontSize: 9.5,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  gridCountBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 6,
    padding: '1px 5px',
  },
  gridCardName: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#FFFFFF',
    lineHeight: 1.2,
  },
  gridCardSubj: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: 500,
  },
  gridCardEmpty: {
    borderRadius: 14,
    backgroundColor: '#1E293B',
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    opacity: 0.6,
  },
  emptyCardText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: 600,
  },
  detailBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  detailCardPlate: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
};
