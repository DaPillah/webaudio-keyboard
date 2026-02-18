document.addEventListener("DOMContentLoaded", () => {

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // ---------- GLOBAL GAIN ----------
  const globalGain = audioCtx.createGain();
  globalGain.gain.value = 0.35;
  globalGain.connect(audioCtx.destination);

  // ---------- UI ----------
  let synthMode = "additive";

  const synthModeSelect = document.getElementById("synthMode");
  const fmDepthSlider = document.getElementById("fmDepth");
  const fmRatioSlider = document.getElementById("fmRatio");
  const amFreqSlider = document.getElementById("amFreq");
  const amDepthSlider = document.getElementById("amDepth");
  const addBrightnessSlider = document.getElementById("addBrightness");

  synthModeSelect.addEventListener("change", e => {
    synthMode = e.target.value;
  });

  // ---------- ADSR ----------
  const ATTACK = 0.02;
  const DECAY = 0.1;
  const SUSTAIN = 0.5;
  const RELEASE = 0.25;
  const PEAK = 0.2;
  const FLOOR = 0.001;

  // ---------- KEY MAP ----------
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
  };

  // ---------- LFO ----------
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 5;
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain);
  lfo.start();

  const activeNotes = {};

  // ---------- LIVE SLIDER UPDATES ----------

  fmDepthSlider.addEventListener("input", () => {
    const v = Number(fmDepthSlider.value);
    Object.values(activeNotes).forEach(note => {
      if (note.fmModGain)
        note.fmModGain.gain.setValueAtTime(v, audioCtx.currentTime);
    });
  });

  fmRatioSlider.addEventListener("input", () => {
    const ratio = Number(fmRatioSlider.value);
    Object.values(activeNotes).forEach(note => {
      if (note.fmModOsc && note.baseFreq)
        note.fmModOsc.frequency.setValueAtTime(
          note.baseFreq * ratio,
          audioCtx.currentTime
        );
    });
  });

  amFreqSlider.addEventListener("input", () => {
    const v = Number(amFreqSlider.value);
    Object.values(activeNotes).forEach(note => {
      if (note.amModOsc)
        note.amModOsc.frequency.setValueAtTime(v, audioCtx.currentTime);
    });
  });

  amDepthSlider.addEventListener("input", () => {
    const v = Number(amDepthSlider.value);
    Object.values(activeNotes).forEach(note => {
      if (note.amModGain)
        note.amModGain.gain.setValueAtTime(v, audioCtx.currentTime);
    });
  });

  addBrightnessSlider.addEventListener("input", () => {
    const b = Number(addBrightnessSlider.value);

    Object.values(activeNotes).forEach(note => {
      if (!note.addPartials) return;

      note.addPartials.forEach(p => {
        const target =
          (p.ratio === 1) ? p.baseAmp : p.baseAmp * b;

        p.gainNode.gain.setValueAtTime(
          target,
          audioCtx.currentTime
        );
      });
    });
  });

  // ---------- EVENTS ----------
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  function keyDown(e) {
    if (audioCtx.state === "suspended") audioCtx.resume();

    const key = e.which.toString();
    if (!keyboardFrequencyMap[key]) return;
    if (activeNotes[key]) return;

    startNote(key);
  }

  function keyUp(e) {
    stopNote(e.which.toString());
  }

  // ---------- START NOTE ----------
  function startNote(key) {
    const freq = keyboardFrequencyMap[key];
    const now = audioCtx.currentTime;

    const noteGain = audioCtx.createGain();
    const tremoloGain = audioCtx.createGain();

    noteGain.gain.setValueAtTime(FLOOR, now);
    noteGain.gain.exponentialRampToValueAtTime(PEAK, now + ATTACK);
    noteGain.gain.exponentialRampToValueAtTime(
      PEAK * SUSTAIN,
      now + ATTACK + DECAY
    );

    noteGain.connect(tremoloGain);
    tremoloGain.connect(globalGain);
    lfoGain.connect(tremoloGain.gain);

    let oscillators = [];
    let noteData = {
      oscillators,
      gainNode: noteGain,
      baseFreq: freq
    };

    // ===== ADDITIVE =====
    if (synthMode === "additive") {

      const b = Number(addBrightnessSlider.value);
      noteData.addPartials = [];

      const partials = [
        { ratio: 1, amp: 0.6 },
        { ratio: 2, amp: 0.25 },
        { ratio: 3, amp: 0.15 }
      ];

      partials.forEach(p => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();

        osc.frequency.value = freq * p.ratio;
        g.gain.value = (p.ratio === 1) ? p.amp : p.amp * b;

        osc.connect(g).connect(noteGain);
        osc.start();

        oscillators.push(osc);

        noteData.addPartials.push({
          ratio: p.ratio,
          gainNode: g,
          baseAmp: p.amp
        });
      });
    }

    // ===== AM =====
    if (synthMode === "am") {

      const carrier = audioCtx.createOscillator();
      const carrierGain = audioCtx.createGain();

      const mod = audioCtx.createOscillator();
      const modGain = audioCtx.createGain();

      carrier.frequency.value = freq;
      mod.frequency.value = Number(amFreqSlider.value);
      modGain.gain.value = Number(amDepthSlider.value);

      mod.connect(modGain);
      modGain.connect(carrierGain.gain);

      carrier.connect(carrierGain).connect(noteGain);

      carrier.start();
      mod.start();

      oscillators.push(carrier, mod);

      noteData.amModOsc = mod;
      noteData.amModGain = modGain;
    }

    // ===== FM =====
    if (synthMode === "fm") {

      const carrier = audioCtx.createOscillator();
      const mod = audioCtx.createOscillator();
      const modGain = audioCtx.createGain();

      carrier.frequency.value = freq;
      mod.frequency.value = freq * Number(fmRatioSlider.value);
      modGain.gain.value = Number(fmDepthSlider.value);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      carrier.connect(noteGain);

      carrier.start();
      mod.start();

      oscillators.push(carrier, mod);

      noteData.fmModGain = modGain;
      noteData.fmModOsc = mod;
    }

    activeNotes[key] = noteData;
  }

  // ---------- STOP NOTE ----------
  function stopNote(key) {
    const note = activeNotes[key];
    if (!note) return;

    const now = audioCtx.currentTime;

    note.gainNode.gain.cancelScheduledValues(now);
    note.gainNode.gain.setValueAtTime(
      Math.max(note.gainNode.gain.value, FLOOR),
      now
    );

    note.gainNode.gain.exponentialRampToValueAtTime(FLOOR, now + RELEASE);

    note.oscillators.forEach(osc => osc.stop(now + RELEASE));

    delete activeNotes[key];
  }

});
