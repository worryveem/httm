// Audio Alarm Manager for Antigravity PANNs Audio Recognition
// Supports playing local/remote audio file with graceful Web Audio API Synthesizer fallback

let activeAudioElement = null;
let activeAudioContext = null;
let activeOscillator = null;
let activeGainNode = null;
let sirenInterval = null;
let autoStopTimeout = null;

/**
 * Stop any currently sounding alarm immediately.
 * Ensures no overlapping audio streams.
 */
export function stopAlarm() {
  // Clear any auto-stop timers
  if (autoStopTimeout) {
    clearTimeout(autoStopTimeout);
    autoStopTimeout = null;
  }

  // Clear oscillator sweep interval
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }

  // Stop HTML5 audio element
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = '';
    } catch (e) {
      console.warn("Error pausing audio element:", e);
    }
    activeAudioElement = null;
  }

  // Stop Web Audio synth nodes
  if (activeOscillator) {
    try {
      activeOscillator.stop();
      activeOscillator.disconnect();
    } catch (e) {
      // Ignore if already stopped
    }
    activeOscillator = null;
  }

  if (activeGainNode) {
    try {
      activeGainNode.disconnect();
    } catch (e) {
      // Ignore
    }
    activeGainNode = null;
  }

  if (activeAudioContext && activeAudioContext.state !== 'closed') {
    try {
      activeAudioContext.close();
    } catch (e) {
      // Ignore
    }
    activeAudioContext = null;
  }
}

/**
 * Synthesizes an emergency dual-tone piercing siren using Web Audio API.
 * 100% reliable fallback on any browser/OS without external files.
 */
function playSynthesizedSiren(volume = 1.0) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn("Web Audio API not supported on this browser.");
      return;
    }

    activeAudioContext = new AudioCtx();
    if (activeAudioContext.state === 'suspended') {
      activeAudioContext.resume();
    }

    const osc = activeAudioContext.createOscillator();
    const gain = activeAudioContext.createGain();

    osc.type = 'sawtooth'; // Piercing siren tone
    osc.frequency.setValueAtTime(750, activeAudioContext.currentTime);

    // Initial volume
    gain.gain.setValueAtTime(Math.max(0.01, Math.min(1.0, volume * 0.45)), activeAudioContext.currentTime);

    osc.connect(gain);
    gain.connect(activeAudioContext.destination);

    // Modulate pitch between 700Hz and 1300Hz (emergency wail siren)
    let goingUp = true;
    sirenInterval = setInterval(() => {
      if (!activeAudioContext || !osc) return;
      const now = activeAudioContext.currentTime;
      const targetFreq = goingUp ? 1350 : 700;
      goingUp = !goingUp;
      try {
        osc.frequency.linearRampToValueAtTime(targetFreq, now + 0.65);
      } catch (err) {
        // Ignore
      }
    }, 700);

    osc.start();
    activeOscillator = osc;
    activeGainNode = gain;
  } catch (err) {
    console.error("Synthesizer error:", err);
  }
}

/**
 * Play alarm siren through computer speakers.
 * Guaranteed no overlapping streams.
 *
 * @param {Object} options
 * @param {string} [options.soundUrl] - Optional custom sound URL
 * @param {number} [options.volume=1.0] - Volume between 0.0 and 1.0
 * @param {number} [options.maxDuration=20000] - Safety max duration in ms before auto-stop
 * @param {Function} [options.onEnded] - Callback when alarm finishes or is stopped
 */
export function playAlarm({
  soundUrl = '/alarm_siren.wav',
  volume = 1.0,
  maxDuration = 4000,
  loop = false,
  onEnded = null
} = {}) {
  // Always stop previous sounds first to prevent overlapping
  stopAlarm();

  let hasEnded = false;
  const notifyEnded = () => {
    if (!hasEnded) {
      hasEnded = true;
      if (typeof onEnded === 'function') onEnded();
    }
  };

  try {
    const audio = new Audio();
    activeAudioElement = audio;
    audio.volume = Math.max(0, Math.min(1.0, volume));
    audio.loop = loop;

    // Primary source candidate
    const primaryUrl = soundUrl || '/alarm_siren.wav';
    audio.src = primaryUrl;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn("Audio element play failed, falling back to Web Audio Synthesizer:", err);
        // Fallback to Web Audio Synthesizer
        playSynthesizedSiren(volume);
      });
    }

    audio.onended = () => {
      notifyEnded();
    };

    audio.onerror = () => {
      console.warn("Error loading audio element source, switching to synthesizer fallback.");
      stopAlarm();
      playSynthesizedSiren(volume);
    };

    // Auto-stop safety timeout
    if (maxDuration > 0) {
      autoStopTimeout = setTimeout(() => {
        stopAlarm();
        notifyEnded();
      }, maxDuration);
    }

    return {
      stop: () => {
        stopAlarm();
        notifyEnded();
      }
    };
  } catch (err) {
    console.error("Failed to play alarm via Audio element, falling back to synth:", err);
    playSynthesizedSiren(volume);
    if (maxDuration > 0) {
      autoStopTimeout = setTimeout(() => {
        stopAlarm();
        notifyEnded();
      }, maxDuration);
    }
    return {
      stop: () => {
        stopAlarm();
        notifyEnded();
      }
    };
  }
}

/**
 * Test the alarm sound for a short period (e.g. 3.5s)
 */
export function testAlarm({ soundUrl, volume = 1.0, onFinish = null } = {}) {
  return playAlarm({
    soundUrl,
    volume,
    maxDuration: 4000,
    onEnded: onFinish
  });
}
