/**
 * Procedural Audio Synthesizer for Lisquiz
 * Pure Web Audio API synthesis (0 KB network overhead, zero latency)
 * Tuned for mobile phone mono/stereo speakers & claymorphism aesthetics.
 */

/**
 * 1. btn_clay_tap: Soft tactile tap on damp clay / plasticine button
 */
export function playClayTap(ctx: AudioContext, masterGain = 1): void {
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Exponential pitch drop creates tactile clay density feel
  osc.type = 'sine';
  osc.frequency.setValueAtTime(290, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.035);

  // Lowpass filter eliminates metallic click and harshness
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(320, now + 0.035);

  const targetVol = 0.55 * masterGain;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(targetVol, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.04);
}

/**
 * 2. water_drop_grove: Upward Minnaert bubble resonance (watering tree in Class Grove)
 */
export function playWaterDrop(ctx: AudioContext, masterGain = 1): void {
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Bubble physics: expanding air cavity produces rapid upward sweep
  osc.type = 'sine';
  osc.frequency.setValueAtTime(460, now);
  osc.frequency.exponentialRampToValueAtTime(1380, now + 0.07);

  const targetVol = 0.6 * masterGain;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(targetVol, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.085);
}

/**
 * 3. timer_last_3sec / wood_knock: Dry hollow wooden temple block
 */
export function playWoodKnock(ctx: AudioContext, masterGain = 1): void {
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const bandpass = ctx.createBiquadFilter();

  // Triangle wave provides rich wooden odd harmonics
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(650, now);
  osc.frequency.exponentialRampToValueAtTime(190, now + 0.028);

  // Bandpass filter simulates the hollow resonance chamber of dry wood
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(880, now);
  bandpass.Q.setValueAtTime(5.2, now);

  const targetVol = 0.65 * masterGain;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(targetVol, now + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

  osc.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.035);
}

/**
 * 4. acorn_collect: Crisp pop + bell chime when picking acorns or gaining XP
 */
export function playAcornCollect(ctx: AudioContext, masterGain = 1): void {
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;

  // Pop oscillator
  const popOsc = ctx.createOscillator();
  const popGain = ctx.createGain();
  popOsc.type = 'sine';
  popOsc.frequency.setValueAtTime(320, now);
  popOsc.frequency.exponentialRampToValueAtTime(920, now + 0.025);
  popGain.gain.setValueAtTime(0.0001, now);
  popGain.gain.linearRampToValueAtTime(0.45 * masterGain, now + 0.002);
  popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  popOsc.connect(popGain);
  popGain.connect(ctx.destination);
  popOsc.start(now);
  popOsc.stop(now + 0.045);

  // Chime harmonic
  const chimeOsc = ctx.createOscillator();
  const chimeGain = ctx.createGain();
  chimeOsc.type = 'sine';
  chimeOsc.frequency.setValueAtTime(1760, now + 0.015); // A6
  chimeGain.gain.setValueAtTime(0.0001, now);
  chimeGain.gain.setValueAtTime(0.0001, now + 0.015);
  chimeGain.gain.linearRampToValueAtTime(0.35 * masterGain, now + 0.02);
  chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  chimeOsc.connect(chimeGain);
  chimeGain.connect(ctx.destination);
  chimeOsc.start(now + 0.015);
  chimeOsc.stop(now + 0.13);
}

/**
 * 5. answer_correct_chime: Joyful crystalline major third chime (C6 = 1046.5Hz, E6 = 1318.5Hz, G6 = 1568Hz)
 */
export function playCorrectChime(ctx: AudioContext, masterGain = 1): void {
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const notes = [1046.5, 1318.5, 1568.0]; // C6, E6, G6

  notes.forEach((freq, idx) => {
    const delay = idx * 0.035;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + delay);

    // Filter to tame aggressive high frequencies on mobile speakers
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now + delay);

    const targetVol = (0.28 / (idx + 1)) * masterGain;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.linearRampToValueAtTime(targetVol, now + delay + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.4);
  });
}

/**
 * 6. answer_wrong_soft_thud: Gentle clay thud falling on forest moss (soft, non-punishing, encouraging)
 */
export function playWrongSoftThud(ctx: AudioContext, masterGain = 1): void {
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.12);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(450, now);
  filter.frequency.exponentialRampToValueAtTime(140, now + 0.12);

  const targetVol = 0.5 * masterGain;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(targetVol, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * 7. playVictoryStinger: Ascending festive arpeggio (C5 -> E5 -> G5 -> C6) for rank-up or podium
 */
export function playVictoryStinger(ctx: AudioContext, masterGain = 1): void {
  if (ctx.state !== 'running') return;
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, idx) => {
    const delay = idx * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + delay);

    const isLast = idx === notes.length - 1;
    const duration = isLast ? 0.6 : 0.22;
    const targetVol = (isLast ? 0.45 : 0.3) * masterGain;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.linearRampToValueAtTime(targetVol, now + delay + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + duration + 0.05);
  });
}
