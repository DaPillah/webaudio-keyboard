document.addEventListener("DOMContentLoaded", () => {

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();


  const globalGain = audioCtx.createGain();
  globalGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
  globalGain.connect(audioCtx.destination);

  let currentWaveform = 'sine';
  document.getElementById('waveform').addEventListener('change', e => {
    currentWaveform = e.target.value;
  });


  const ATTACK  = 0.02;
  const DECAY   = 0.1;
  const SUSTAIN = 0.5;
  const RELEASE = 0.25;
  const PEAK    = 0.2;
  const FLOOR   = 0.001;


  const keyboardFrequencyMap = {
    '90': 261.625565300598634,  //Z - C
    '83': 277.182630976872096, //S - C#
    '88': 293.664767917407560,  //X - D
    '68': 311.126983722080910, //D - D#
    '67': 329.627556912869929,  //C - E
    '86': 349.228231433003884,  //V - F
    '71': 369.994422711634398, //G - F#
    '66': 391.995435981749294,  //B - G
    '72': 415.304697579945138, //H - G#
    '78': 440.000000000000000,  //N - A
    '74': 466.163761518089916, //J - A#
    '77': 493.883301256124111,  //M - B
    '81': 523.251130601197269,  //Q - C
    '50': 554.365261953744192, //2 - C#
    '87': 587.329535834815120,  //W - D
    '51': 622.253967444161821, //3 - D#
    '69': 659.255113825739859,  //E - E
    '82': 698.456462866007768,  //R - F
    '53': 739.988845423268797, //5 - F#
    '84': 783.990871963498588,  //T - G
    '54': 830.609395159890277, //6 - G#
    '89': 880.000000000000000,  //Y - A
    '55': 932.327523036179832, //7 - A#
    '85': 987.766602512248223,  //U - B
}


  const heldKeys = new Set();           
  let currentArpKey = null;             
  let arpIndex = 0;
  let arpInterval = null;
  let arpEnabled = false;
  const ARP_RATE = 150;

  document.getElementById('arpToggle').addEventListener('change', e => {
    arpEnabled = e.target.checked;
    stopArpeggiator();
  });

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  // ---------- EVENTS ----------
  function keyDown(event) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const key = event.which.toString();
    if (!keyboardFrequencyMap[key]) return;
    if (heldKeys.has(key)) return;

    heldKeys.add(key);

    if (arpEnabled && !arpInterval) {
      startArpeggiator();
    }

    if (!arpEnabled) {
      startNote(key);
    }
  }

  function keyUp(event) {
    const key = event.which.toString();
    heldKeys.delete(key);

    if (!arpEnabled) {
      stopNote(key);
      return;
    }

    if (key === currentArpKey) {
      stopNote(key);
      currentArpKey = null;
    }

    if (heldKeys.size === 0) {
      stopArpeggiator();
    }
  }


  function startArpeggiator() {
    arpIndex = 0;

    arpInterval = setInterval(() => {
      if (heldKeys.size === 0) return;

      const keys = Array.from(heldKeys);
      const nextKey = keys[arpIndex % keys.length];

      if (currentArpKey && currentArpKey !== nextKey) {
        stopNote(currentArpKey);
      }

      if (currentArpKey !== nextKey) {
        startNote(nextKey);
        currentArpKey = nextKey;
      }

      arpIndex++;
    }, ARP_RATE);
  }

  function stopArpeggiator() {
    clearInterval(arpInterval);
    arpInterval = null;
    arpIndex = 0;

    if (currentArpKey) {
      stopNote(currentArpKey);
      currentArpKey = null;
    }
  }


  const activeNotes = {};

  function startNote(key) {
    if (activeNotes[key]) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = currentWaveform;
    osc.frequency.setValueAtTime(
      keyboardFrequencyMap[key],
      audioCtx.currentTime
    );

    const now = audioCtx.currentTime;

    gainNode.gain.setValueAtTime(FLOOR, now);
    gainNode.gain.exponentialRampToValueAtTime(PEAK, now + ATTACK);
    gainNode.gain.exponentialRampToValueAtTime(
      PEAK * SUSTAIN,
      now + ATTACK + DECAY
    );

    osc.connect(gainNode);
    gainNode.connect(globalGain);

    osc.start();

    activeNotes[key] = { osc, gainNode };
  }

  function stopNote(key) {
    const note = activeNotes[key];
    if (!note) return;

    const now = audioCtx.currentTime;

    note.gainNode.gain.cancelScheduledValues(now);
    note.gainNode.gain.setValueAtTime(
      Math.max(note.gainNode.gain.value, FLOOR),
      now
    );

    note.gainNode.gain.exponentialRampToValueAtTime(
      FLOOR,
      now + RELEASE
    );

    note.osc.stop(now + RELEASE);
    delete activeNotes[key];
  }

});
