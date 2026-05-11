const EFFECT_LIBRARY = {
  distortion: {
    label: "Distortion",
    description: "Pushes harmonics forward with waveshaping and a post-drive tone filter.",
    defaults: {
      drive: 34,
      tone: 3200,
      mix: 72,
    },
    controls: [
      { key: "drive", label: "Drive", min: 0, max: 100, step: 1 },
      { key: "tone", label: "Tone", min: 500, max: 8000, step: 10, suffix: " Hz" },
      { key: "mix", label: "Wet / Dry", min: 0, max: 100, step: 1, suffix: "%" },
    ],
  },
  filter: {
    label: "Filter",
    description: "Carves the spectrum so you can sweep between dark, nasal, and bright tones.",
    defaults: {
      mode: "lowpass",
      frequency: 1800,
      q: 1.1,
      mix: 100,
    },
    controls: [
      {
        key: "mode",
        label: "Mode",
        type: "select",
        options: [
          { value: "lowpass", label: "Low-pass" },
          { value: "highpass", label: "High-pass" },
          { value: "bandpass", label: "Band-pass" },
        ],
      },
      { key: "frequency", label: "Cutoff", min: 120, max: 9000, step: 10, suffix: " Hz" },
      { key: "q", label: "Resonance", min: 0.1, max: 14, step: 0.1 },
      { key: "mix", label: "Wet / Dry", min: 0, max: 100, step: 1, suffix: "%" },
    ],
  },
  delay: {
    label: "Delay",
    description: "Adds repeating echoes with controllable time, feedback, and brightness.",
    defaults: {
      time: 0.32,
      feedback: 0.42,
      tone: 3800,
      mix: 38,
    },
    controls: [
      { key: "time", label: "Delay Time", min: 0.05, max: 1.2, step: 0.01, suffix: " s" },
      { key: "feedback", label: "Feedback", min: 0, max: 0.9, step: 0.01 },
      { key: "tone", label: "Repeat Tone", min: 700, max: 7000, step: 10, suffix: " Hz" },
      { key: "mix", label: "Wet / Dry", min: 0, max: 100, step: 1, suffix: "%" },
    ],
  },
  tremolo: {
    label: "Tremolo",
    description: "Modulates volume with an LFO so the guitar breathes, pulses, and sways.",
    defaults: {
      rate: 4.8,
      depth: 0.65,
      mix: 100,
    },
    controls: [
      { key: "rate", label: "Rate", min: 0.2, max: 12, step: 0.1, suffix: " Hz" },
      { key: "depth", label: "Depth", min: 0, max: 1, step: 0.01 },
      { key: "mix", label: "Wet / Dry", min: 0, max: 100, step: 1, suffix: "%" },
    ],
  },
  reverb: {
    label: "Convolution Reverb",
    description: "Generates an impulse response for roomy reflections and spacious tails.",
    defaults: {
      decay: 2.8,
      tone: 4600,
      mix: 32,
    },
    controls: [
      { key: "decay", label: "Decay", min: 0.5, max: 6, step: 0.1, suffix: " s" },
      { key: "tone", label: "Damping", min: 1000, max: 9000, step: 10, suffix: " Hz" },
      { key: "mix", label: "Wet / Dry", min: 0, max: 100, step: 1, suffix: "%" },
    ],
  },
};

const PRESET_STORAGE_KEY = "tone-lab-presets-v1";
const SETTINGS_STORAGE_KEY = "tone-lab-settings-v1";

const DEFAULT_AMP_CAB_STATE = {
  enabled: true,
  ampModel: "clean",
  cabModel: "open-2x12",
  drive: 28,
  bass: 0,
  mid: 0,
  treble: 0,
  presence: 0,
  level: 0.95,
};

const AMP_MODEL_CONFIG = {
  clean: {
    label: "Clean",
    inputTrim: 1.1,
    driveBoost: 2.8,
    saturationBase: 1.25,
    saturationRange: 2.2,
    bassBias: 0.5,
    midBias: -0.5,
    trebleBias: 1.1,
    presenceBias: 0.9,
    tightnessHz: 85,
    levelTrim: 0.98,
  },
  crunch: {
    label: "Crunch",
    inputTrim: 1.35,
    driveBoost: 5.8,
    saturationBase: 2.5,
    saturationRange: 4.3,
    bassBias: -0.5,
    midBias: 1.8,
    trebleBias: 0.4,
    presenceBias: 1.3,
    tightnessHz: 105,
    levelTrim: 0.88,
  },
  lead: {
    label: "Lead",
    inputTrim: 1.55,
    driveBoost: 8.3,
    saturationBase: 3.8,
    saturationRange: 6.2,
    bassBias: -1.2,
    midBias: 3.1,
    trebleBias: -0.2,
    presenceBias: 2.2,
    tightnessHz: 125,
    levelTrim: 0.8,
  },
};

const CAB_MODEL_CONFIG = {
  "combo-1x12": {
    label: "1x12 Combo",
    highpassHz: 95,
    lowpassHz: 4100,
    bodyFreq: 185,
    bodyGain: 1.6,
    bodyQ: 0.78,
    airCutDb: -3.8,
  },
  "open-2x12": {
    label: "2x12 Open Back",
    highpassHz: 82,
    lowpassHz: 4750,
    bodyFreq: 220,
    bodyGain: 2.5,
    bodyQ: 0.82,
    airCutDb: -2.4,
  },
  "closed-4x12": {
    label: "4x12 Closed Back",
    highpassHz: 70,
    lowpassHz: 3650,
    bodyFreq: 145,
    bodyGain: 4.1,
    bodyQ: 0.95,
    airCutDb: -5.6,
  },
};

const SYSTEM_DEFAULT_INPUT = {
  deviceId: "",
  label: "System Default Input",
};

const state = {
  audioContext: null,
  sourceBus: null,
  chainInput: null,
  pedalboardOutput: null,
  chainOutput: null,
  analyserWave: null,
  analyserSpectrum: null,
  masterGain: null,
  effects: [],
  selectedEffectId: null,
  bufferSource: null,
  audioBuffer: null,
  activeClipLabel: "",
  availableInputDevices: [],
  selectedInputDeviceId: "",
  selectedInputLabel: SYSTEM_DEFAULT_INPUT.label,
  liveInputStream: null,
  liveInputSource: null,
  liveInputGainNode: null,
  liveInputStreamDeviceId: "",
  liveInputActive: false,
  liveInputGain: 1,
  devicePermissionGranted: false,
  liveInputStatusMessage: "Click Detect Inputs to grant access, then choose your guitar interface.",
  mediaRecorder: null,
  recorderChunks: [],
  isRecording: false,
  isPlaying: false,
  activeMode: null,
  globalBypass: false,
  presets: [],
  renderLoopStarted: false,
  previewUrl: "",
  previewSource: null,
  ampCab: { ...DEFAULT_AMP_CAB_STATE },
  ampCabStage: null,
};

let eventsRegistered = false;
let chainInteractionsInstalled = false;

const dom = {
  wakeAudioBtn: document.getElementById("wakeAudioBtn"),
  globalBypassBtn: document.getElementById("globalBypassBtn"),
  fileInput: document.getElementById("fileInput"),
  playBtn: document.getElementById("playBtn"),
  recordBtn: document.getElementById("recordBtn"),
  stopBtn: document.getElementById("stopBtn"),
  loopToggle: document.getElementById("loopToggle"),
  inputDeviceSelect: document.getElementById("inputDeviceSelect"),
  authorizeInputBtn: document.getElementById("authorizeInputBtn"),
  refreshDevicesBtn: document.getElementById("refreshDevicesBtn"),
  liveInputGain: document.getElementById("liveInputGain"),
  liveInputGainValue: document.getElementById("liveInputGainValue"),
  liveInputBtn: document.getElementById("liveInputBtn"),
  liveInputBadge: document.getElementById("liveInputBadge"),
  liveInputStatus: document.getElementById("liveInputStatus"),
  liveInputGuidance: document.getElementById("liveInputGuidance"),
  loadedClipLabel: document.getElementById("loadedClipLabel"),
  topStatusText: document.getElementById("topStatusText"),
  takePreview: document.getElementById("takePreview"),
  ampCabEnabled: document.getElementById("ampCabEnabled"),
  ampCabBadge: document.getElementById("ampCabBadge"),
  ampModelSelect: document.getElementById("ampModelSelect"),
  cabModelSelect: document.getElementById("cabModelSelect"),
  ampDrive: document.getElementById("ampDrive"),
  ampDriveValue: document.getElementById("ampDriveValue"),
  ampLevel: document.getElementById("ampLevel"),
  ampLevelValue: document.getElementById("ampLevelValue"),
  ampBass: document.getElementById("ampBass"),
  ampBassValue: document.getElementById("ampBassValue"),
  ampMid: document.getElementById("ampMid"),
  ampMidValue: document.getElementById("ampMidValue"),
  ampTreble: document.getElementById("ampTreble"),
  ampTrebleValue: document.getElementById("ampTrebleValue"),
  ampPresence: document.getElementById("ampPresence"),
  ampPresenceValue: document.getElementById("ampPresenceValue"),
  ampCabStatus: document.getElementById("ampCabStatus"),
  masterGain: document.getElementById("masterGain"),
  masterGainValue: document.getElementById("masterGainValue"),
  presetName: document.getElementById("presetName"),
  presetSelect: document.getElementById("presetSelect"),
  savePresetBtn: document.getElementById("savePresetBtn"),
  loadPresetBtn: document.getElementById("loadPresetBtn"),
  deletePresetBtn: document.getElementById("deletePresetBtn"),
  statusText: document.getElementById("statusText"),
  transportBadge: document.getElementById("transportBadge"),
  libraryGrid: document.getElementById("libraryGrid"),
  chainList: document.getElementById("chainList"),
  chainEmptyState: document.getElementById("chainEmptyState"),
  inspectorPanel: document.getElementById("inspectorPanel"),
  insightPanel: document.getElementById("insightPanel"),
  selectedBadge: document.getElementById("selectedBadge"),
  sourceStat: document.getElementById("sourceStat"),
  chainStat: document.getElementById("chainStat"),
  presetStat: document.getElementById("presetStat"),
  waveCanvas: document.getElementById("waveCanvas"),
  spectrumCanvas: document.getElementById("spectrumCanvas"),
};

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatFixedNumber(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function getAmpModelLabel(model) {
  return AMP_MODEL_CONFIG[model]?.label ?? "Clean";
}

function getCabModelLabel(model) {
  return CAB_MODEL_CONFIG[model]?.label ?? "2x12 Open Back";
}

function getDefaultInputOption() {
  return { ...SYSTEM_DEFAULT_INPUT };
}

function setLiveInputStatus(message) {
  state.liveInputStatusMessage = message;
}

function setFatalError(message) {
  state.liveInputStatusMessage = message;
  if (dom.statusText) {
    dom.statusText.textContent = message;
  }
  if (dom.topStatusText) {
    dom.topStatusText.textContent = message;
  }
  if (dom.liveInputStatus) {
    dom.liveInputStatus.textContent = message;
  }
}

function createPlaceholderInstance() {
  return {
    isPlaceholder: true,
    input: { disconnect() {} },
    output: { disconnect() {} },
    bypass: { gain: { value: 0 } },
    dry: { gain: { value: 0 } },
    wet: { gain: { value: 0 } },
    destroy() {},
    update() {},
  };
}

function buildEffectRecord(type, overrides = {}) {
  const config = EFFECT_LIBRARY[type];
  const params = { ...config.defaults, ...(overrides.params ?? {}) };
  const enabled = overrides.enabled ?? true;

  return {
    id: overrides.id ?? uid(type),
    type,
    enabled,
    params,
    instance: state.audioContext ? createEffectInstance(type, params, enabled) : createPlaceholderInstance(),
  };
}

function materializeEffectInstances() {
  if (!state.audioContext) {
    return;
  }

  state.effects = state.effects.map((effect) => {
    if (!effect.instance.isPlaceholder) {
      return effect;
    }

    return {
      ...effect,
      instance: createEffectInstance(effect.type, effect.params, effect.enabled),
    };
  });
}

async function ensureAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("This browser does not support WebAudio. Please use Chrome or Edge on desktop.");
    }
    state.audioContext = new AudioContextClass();

    state.sourceBus = state.audioContext.createGain();
    state.chainInput = state.audioContext.createGain();
    state.pedalboardOutput = state.audioContext.createGain();
    state.chainOutput = state.audioContext.createGain();
    state.masterGain = state.audioContext.createGain();
    state.analyserWave = state.audioContext.createAnalyser();
    state.analyserSpectrum = state.audioContext.createAnalyser();
    state.ampCabStage = createAmpCabStage(state.ampCab);

    state.analyserWave.fftSize = 2048;
    state.analyserSpectrum.fftSize = 1024;
    state.masterGain.gain.value = Number(dom.masterGain.value);

    state.sourceBus.connect(state.chainInput);
    state.ampCabStage.output.connect(state.chainOutput);
    state.chainOutput.connect(state.analyserWave);
    state.analyserWave.connect(state.analyserSpectrum);
    state.analyserSpectrum.connect(state.masterGain);
    state.masterGain.connect(state.audioContext.destination);

    materializeEffectInstances();
    rebuildAudioChain();
    startVisualizers();
  }

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }

    setStatus("Audio engine is awake. Click Detect Inputs for guitar, or load a clip to start.");
  return state.audioContext;
}

function ensurePreviewRouting() {
  if (!state.audioContext || state.previewSource) {
    return;
  }

  state.previewSource = state.audioContext.createMediaElementSource(dom.takePreview);
  state.previewSource.connect(state.sourceBus);
}

function createDryWetRouting(context) {
  const input = context.createGain();
  const output = context.createGain();
  const bypass = context.createGain();
  const dry = context.createGain();
  const wet = context.createGain();
  const wetInput = context.createGain();

  input.connect(bypass);
  input.connect(dry);
  input.connect(wetInput);
  bypass.connect(output);
  dry.connect(output);
  wet.connect(output);

  return {
    input,
    output,
    bypass,
    dry,
    wet,
    wetInput,
  };
}

function updateDryWetMix(effectState) {
  const mixValue = Number(effectState.params.mix ?? 100) / 100;

  if (!effectState.enabled) {
    effectState.instance.bypass.gain.value = 1;
    effectState.instance.dry.gain.value = 0;
    effectState.instance.wet.gain.value = 0;
    return;
  }

  effectState.instance.bypass.gain.value = 0;
  effectState.instance.dry.gain.value = clamp(1 - mixValue, 0, 1);
  effectState.instance.wet.gain.value = clamp(mixValue, 0, 1);
}

function makeDistortionCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const shaped = 1 + amount * 5;

  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + shaped) * x * 20 * (Math.PI / 180)) / (Math.PI + shaped * Math.abs(x));
  }

  return curve;
}

function createImpulseResponse(context, seconds, dampingHz) {
  const sampleRate = context.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * seconds));
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const decay = Math.pow(1 - i / length, seconds * 1.5);
      const brightness = Math.exp((-dampingHz / 20000) * (i / sampleRate));
      data[i] = (Math.random() * 2 - 1) * decay * brightness;
    }
  }

  return impulse;
}

function makeAmpDriveCurve(amount) {
  const samples = 2048;
  const curve = new Float32Array(samples);
  const safeAmount = Math.max(0.25, amount);
  const normalizer = Math.tanh(safeAmount);

  for (let index = 0; index < samples; index += 1) {
    const x = (index / (samples - 1)) * 2 - 1;
    curve[index] = Math.tanh(safeAmount * x) / normalizer;
  }

  return curve;
}

function createAmpCabStage(params) {
  const context = state.audioContext;
  const input = context.createGain();
  const output = context.createGain();
  const bypass = context.createGain();
  const processGate = context.createGain();
  const inputTrim = context.createGain();
  const preHighpass = context.createBiquadFilter();
  const driveGain = context.createGain();
  const shaper = context.createWaveShaper();
  const bass = context.createBiquadFilter();
  const mid = context.createBiquadFilter();
  const treble = context.createBiquadFilter();
  const presence = context.createBiquadFilter();
  const cabHighpass = context.createBiquadFilter();
  const cabBody = context.createBiquadFilter();
  const cabLowpass = context.createBiquadFilter();
  const cabAirCut = context.createBiquadFilter();
  const level = context.createGain();

  preHighpass.type = "highpass";
  bass.type = "lowshelf";
  bass.frequency.value = 160;
  mid.type = "peaking";
  mid.frequency.value = 820;
  mid.Q.value = 0.85;
  treble.type = "highshelf";
  treble.frequency.value = 2350;
  presence.type = "highshelf";
  presence.frequency.value = 3850;
  cabHighpass.type = "highpass";
  cabBody.type = "peaking";
  cabLowpass.type = "lowpass";
  cabAirCut.type = "highshelf";
  cabAirCut.frequency.value = 3050;

  input.connect(bypass);
  bypass.connect(output);

  input.connect(inputTrim);
  inputTrim.connect(preHighpass);
  preHighpass.connect(driveGain);
  driveGain.connect(shaper);
  shaper.connect(bass);
  bass.connect(mid);
  mid.connect(treble);
  treble.connect(presence);
  presence.connect(cabHighpass);
  cabHighpass.connect(cabBody);
  cabBody.connect(cabLowpass);
  cabLowpass.connect(cabAirCut);
  cabAirCut.connect(level);
  level.connect(processGate);
  processGate.connect(output);

  const instance = {
    input,
    output,
    destroy() {},
    update(nextParams) {
      const ampConfig = AMP_MODEL_CONFIG[nextParams.ampModel] ?? AMP_MODEL_CONFIG.clean;
      const cabConfig = CAB_MODEL_CONFIG[nextParams.cabModel] ?? CAB_MODEL_CONFIG["open-2x12"];
      const normalizedDrive = clamp(nextParams.drive / 100, 0, 1);
      const saturationAmount = ampConfig.saturationBase + normalizedDrive * ampConfig.saturationRange;

      bypass.gain.value = nextParams.enabled ? 0 : 1;
      processGate.gain.value = nextParams.enabled ? 1 : 0;

      inputTrim.gain.value = ampConfig.inputTrim;
      preHighpass.frequency.value = ampConfig.tightnessHz;
      driveGain.gain.value = 1 + normalizedDrive * ampConfig.driveBoost;
      shaper.curve = makeAmpDriveCurve(saturationAmount);
      shaper.oversample = "4x";

      bass.gain.value = nextParams.bass + ampConfig.bassBias;
      mid.gain.value = nextParams.mid + ampConfig.midBias;
      treble.gain.value = nextParams.treble + ampConfig.trebleBias;
      presence.gain.value = nextParams.presence + ampConfig.presenceBias;

      cabHighpass.frequency.value = cabConfig.highpassHz;
      cabBody.frequency.value = cabConfig.bodyFreq;
      cabBody.Q.value = cabConfig.bodyQ;
      cabBody.gain.value = cabConfig.bodyGain;
      cabLowpass.frequency.value = cabConfig.lowpassHz;
      cabAirCut.gain.value = cabConfig.airCutDb;

      level.gain.value = nextParams.level * ampConfig.levelTrim;
    },
  };

  instance.update(params);
  return instance;
}

function syncAmpCabStage() {
  if (!state.ampCabStage) {
    return;
  }

  state.ampCabStage.update(state.ampCab);
}

function updateAmpCabSetting(key, value) {
  state.ampCab[key] = value;
  syncAmpCabStage();
  renderAll();
}

function createEffectInstance(type, params, enabled) {
  const context = state.audioContext;
  const routing = createDryWetRouting(context);

  if (type === "distortion") {
    const drive = context.createGain();
    const shaper = context.createWaveShaper();
    const tone = context.createBiquadFilter();

    tone.type = "lowpass";
    routing.wetInput.connect(drive);
    drive.connect(shaper);
    shaper.connect(tone);
    tone.connect(routing.wet);

    const instance = {
      ...routing,
      destroy() {},
      update(nextParams, isEnabled) {
        drive.gain.value = 1 + nextParams.drive / 9;
        shaper.curve = makeDistortionCurve(nextParams.drive / 10);
        shaper.oversample = "4x";
        tone.frequency.value = nextParams.tone;
        updateDryWetMix({ params: nextParams, enabled: isEnabled, instance });
      },
    };

    instance.update(params, enabled);
    return instance;
  }

  if (type === "filter") {
    const filter = context.createBiquadFilter();

    routing.wetInput.connect(filter);
    filter.connect(routing.wet);

    const instance = {
      ...routing,
      destroy() {},
      update(nextParams, isEnabled) {
        filter.type = nextParams.mode;
        filter.frequency.value = nextParams.frequency;
        filter.Q.value = nextParams.q;
        updateDryWetMix({ params: nextParams, enabled: isEnabled, instance });
      },
    };

    instance.update(params, enabled);
    return instance;
  }

  if (type === "delay") {
    const delay = context.createDelay(2);
    const feedback = context.createGain();
    const tone = context.createBiquadFilter();

    tone.type = "lowpass";

    routing.wetInput.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(routing.wet);

    const instance = {
      ...routing,
      destroy() {},
      update(nextParams, isEnabled) {
        delay.delayTime.value = nextParams.time;
        feedback.gain.value = clamp(nextParams.feedback, 0, 0.95);
        tone.frequency.value = nextParams.tone;
        updateDryWetMix({ params: nextParams, enabled: isEnabled, instance });
      },
    };

    instance.update(params, enabled);
    return instance;
  }

  if (type === "tremolo") {
    const amp = context.createGain();
    const base = context.createConstantSource();
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();

    amp.gain.value = 1;
    base.offset.value = 1;
    lfo.type = "sine";

    routing.wetInput.connect(amp);
    amp.connect(routing.wet);
    base.connect(amp.gain);
    lfo.connect(lfoDepth);
    lfoDepth.connect(amp.gain);
    base.start();
    lfo.start();

    const instance = {
      ...routing,
      destroy() {
        base.stop();
        lfo.stop();
      },
      update(nextParams, isEnabled) {
        lfo.frequency.value = nextParams.rate;
        base.offset.value = 1 - nextParams.depth / 2;
        lfoDepth.gain.value = nextParams.depth / 2;
        updateDryWetMix({ params: nextParams, enabled: isEnabled, instance });
      },
    };

    instance.update(params, enabled);
    return instance;
  }

  if (type === "reverb") {
    const convolver = context.createConvolver();
    const tone = context.createBiquadFilter();

    tone.type = "lowpass";

    routing.wetInput.connect(convolver);
    convolver.connect(tone);
    tone.connect(routing.wet);

    const instance = {
      ...routing,
      destroy() {},
      update(nextParams, isEnabled) {
        convolver.buffer = createImpulseResponse(context, nextParams.decay, nextParams.tone);
        tone.frequency.value = nextParams.tone;
        updateDryWetMix({ params: nextParams, enabled: isEnabled, instance });
      },
    };

    instance.update(params, enabled);
    return instance;
  }

  throw new Error(`Unknown effect type: ${type}`);
}

function effectSummary(effect) {
  const config = EFFECT_LIBRARY[effect.type];
  const details = config.controls
    .filter((control) => control.key !== "mix")
    .slice(0, 2)
    .map((control) => {
      const value = effect.params[control.key];
      if (control.type === "select") {
        const match = control.options.find((option) => option.value === value);
        return `${control.label}: ${match ? match.label : value}`;
      }
      return `${control.label}: ${formatValue(value, control)}`;
    });

  return details.join(" • ");
}

function formatValue(value, control) {
  if (typeof value === "number") {
    const rounded = control && control.step && control.step < 1 ? value.toFixed(2) : value.toFixed ? value.toFixed(0) : value;
    return `${rounded}${control?.suffix ?? ""}`;
  }
  return `${value}${control?.suffix ?? ""}`;
}

function addEffect(type) {
  const config = EFFECT_LIBRARY[type];
  const effect = buildEffectRecord(type);
  state.effects.push(effect);
  state.selectedEffectId = effect.id;
  rebuildAudioChain();
  renderAll();
  setStatus(`${config.label} added to the chain.`);
}

function removeEffect(effectId) {
  const index = state.effects.findIndex((effect) => effect.id === effectId);
  if (index === -1) {
    return;
  }

  state.effects[index].instance.destroy();
  state.effects[index].instance.input.disconnect();
  state.effects[index].instance.output.disconnect();
  state.effects.splice(index, 1);

  if (state.selectedEffectId === effectId) {
    state.selectedEffectId = state.effects[0]?.id ?? null;
  }

  rebuildAudioChain();
  renderAll();
  setStatus("Effect removed from the chain.");
}

function updateEffect(effectId, key, value) {
  const effect = state.effects.find((item) => item.id === effectId);
  if (!effect) {
    return;
  }

  effect.params[key] = value;
  effect.instance.update(effect.params, effect.enabled);
  renderAll();
}

function toggleEffect(effectId) {
  const effect = state.effects.find((item) => item.id === effectId);
  if (!effect) {
    return;
  }

  effect.enabled = !effect.enabled;
  effect.instance.update(effect.params, effect.enabled);
  rebuildAudioChain();
  renderAll();
  setStatus(`${EFFECT_LIBRARY[effect.type].label} ${effect.enabled ? "enabled" : "bypassed"}.`);
}

function rebuildAudioChain() {
  if (!state.audioContext || !state.chainInput || !state.chainOutput || !state.pedalboardOutput) {
    return;
  }

  try {
    state.chainInput.disconnect();
  } catch (error) {
    /* no-op */
  }

  state.effects.forEach((effect) => {
    try {
      effect.instance.output.disconnect();
    } catch (error) {
      /* no-op */
    }
  });

  try {
    state.pedalboardOutput.disconnect();
  } catch (error) {
    /* no-op */
  }

  if (state.globalBypass || state.effects.length === 0) {
    if (state.globalBypass) {
      state.chainInput.connect(state.chainOutput);
      return;
    }

    state.chainInput.connect(state.pedalboardOutput);
    state.pedalboardOutput.connect(state.ampCabStage ? state.ampCabStage.input : state.chainOutput);
    return;
  }

  state.chainInput.connect(state.effects[0].instance.input);

  for (let index = 0; index < state.effects.length - 1; index += 1) {
    state.effects[index].instance.output.connect(state.effects[index + 1].instance.input);
  }

  state.effects[state.effects.length - 1].instance.output.connect(state.pedalboardOutput);
  state.pedalboardOutput.connect(state.ampCabStage ? state.ampCabStage.input : state.chainOutput);
}

function renderLibrary() {
  dom.libraryGrid.innerHTML = "";

  Object.entries(EFFECT_LIBRARY).forEach(([type, config]) => {
    const card = document.createElement("div");
    card.className = "library-card";
    card.innerHTML = `
      <h3>${config.label}</h3>
      <p>${config.description}</p>
      <button class="secondary-btn" data-add-effect="${type}">Add Module</button>
    `;
    dom.libraryGrid.appendChild(card);
  });
}

function renderChain() {
  dom.chainList.innerHTML = "";
  dom.chainEmptyState.classList.toggle("hidden", state.effects.length > 0);

  state.effects.forEach((effect, index) => {
    const card = document.createElement("div");
    card.className = `effect-card${state.selectedEffectId === effect.id ? " selected" : ""}`;
    card.draggable = true;
    card.dataset.effectId = effect.id;
    card.innerHTML = `
      <div class="effect-head">
        <div class="effect-meta">
          <span class="effect-index">${index + 1}</span>
          <div>
            <h3>${EFFECT_LIBRARY[effect.type].label}</h3>
            <span class="drag-hint">Drag to change signal order</span>
          </div>
        </div>
        <span class="panel-badge">${effect.enabled ? "Active" : "Bypassed"}</span>
      </div>
      <p class="effect-summary">${effectSummary(effect)}</p>
      <div class="effect-actions">
        <button class="ghost-btn effect-toggle ${effect.enabled ? "on" : "off"}" data-toggle-effect="${effect.id}">
          ${effect.enabled ? "Bypass" : "Enable"}
        </button>
        <button class="secondary-btn" data-select-effect="${effect.id}">Inspect</button>
        <button class="ghost-btn" data-remove-effect="${effect.id}">Remove</button>
      </div>
    `;

    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }
      state.selectedEffectId = effect.id;
      renderAll();
    });

    card.addEventListener("dragstart", () => {
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });

    dom.chainList.appendChild(card);
  });
}

function renderInspector() {
  const effect = state.effects.find((item) => item.id === state.selectedEffectId);

  if (!effect) {
    dom.selectedBadge.textContent = "Nothing selected";
    dom.inspectorPanel.innerHTML = `
      <div class="control-card inspector-placeholder">
        Choose a module from the chain to expose its parameters here.
      </div>
    `;
    return;
  }

  const config = EFFECT_LIBRARY[effect.type];
  dom.selectedBadge.textContent = config.label;
  dom.inspectorPanel.innerHTML = "";

  config.controls.forEach((control) => {
    const card = document.createElement("div");
    card.className = "control-card";

    if (control.type === "select") {
      card.innerHTML = `
        <label for="${effect.id}-${control.key}">${control.label}</label>
        <select id="${effect.id}-${control.key}">
          ${control.options
            .map(
              (option) =>
                `<option value="${option.value}"${effect.params[control.key] === option.value ? " selected" : ""}>${option.label}</option>`,
            )
            .join("")}
        </select>
      `;

      const select = card.querySelector("select");
      select.addEventListener("change", (event) => {
        updateEffect(effect.id, control.key, event.target.value);
      });
    } else {
      card.innerHTML = `
        <div class="slider-head">
          <label for="${effect.id}-${control.key}">${control.label}</label>
          <span class="control-value">${formatValue(effect.params[control.key], control)}</span>
        </div>
        <input
          type="range"
          id="${effect.id}-${control.key}"
          min="${control.min}"
          max="${control.max}"
          step="${control.step}"
          value="${effect.params[control.key]}"
        />
      `;

      const input = card.querySelector("input");
      input.addEventListener("input", (event) => {
        updateEffect(effect.id, control.key, Number(event.target.value));
      });
    }

    dom.inspectorPanel.appendChild(card);
  });
}

function getPairInsight(first, second) {
  const pair = `${first}-${second}`;
  const insights = {
    "distortion-delay": "Distortion before delay saturates the repeats, so the echoes inherit the grit and feel more aggressive.",
    "delay-distortion": "Delay before distortion blends the repeats into the overdrive stage, making the echoes smear together into a denser wall of sound.",
    "filter-distortion": "Filtering before distortion changes which frequencies hit the shaper, so brightness and bite shift dramatically.",
    "distortion-filter": "Filtering after distortion behaves more like tone sculpting on a finished amp sound, shaving off harsh highs or thinning lows.",
    "tremolo-reverb": "Tremolo before reverb makes the room pulse with the volume modulation, so the ambience breathes along with the guitar.",
    "reverb-tremolo": "Tremolo after reverb chops the entire space, which sounds more dramatic and less natural.",
    "delay-reverb": "Delay into reverb pushes repeats deeper into the room, creating a washed-out, cinematic trail.",
    "reverb-delay": "Reverb before delay lets each echo carry ambient tails, which can feel wider but less articulate.",
  };

  return insights[pair] ?? "";
}

function renderInsights() {
  const modules = state.effects.map((effect) => EFFECT_LIBRARY[effect.type].label);
  if (state.ampCab.enabled) {
    modules.push(`${getAmpModelLabel(state.ampCab.ampModel)} Amp`);
    modules.push(getCabModelLabel(state.ampCab.cabModel));
  }
  const activeCount = state.effects.filter((effect) => effect.enabled).length;
  const path = modules.length > 0 ? modules.join(" -> ") : "Dry signal only";
  const tips = [];

  for (let index = 0; index < state.effects.length - 1; index += 1) {
    const tip = getPairInsight(state.effects[index].type, state.effects[index + 1].type);
    if (tip && !tips.includes(tip)) {
      tips.push(tip);
    }
  }

  if (state.effects.length > 0) {
    tips.push(
      `${activeCount} of ${state.effects.length} modules are currently active. Bypassing one stage is a fast way to isolate what that processor contributes to the final tone.`,
    );
  } else {
    tips.push("Start with a filter or distortion module first, then add time-based effects like delay or reverb to hear order-based contrast.");
  }

  if (state.ampCab.enabled) {
    tips.push(
      `${getAmpModelLabel(state.ampCab.ampModel)} adds the overall amp character, while ${getCabModelLabel(state.ampCab.cabModel)} shapes the final speaker response.`,
    );
  }

  dom.insightPanel.innerHTML = `
    <div class="insight-card">
      <span class="section-kicker">Current Route</span>
      <p class="signal-path">${path}</p>
    </div>
    <div class="insight-card">
      <span class="section-kicker">Listening Guide</span>
      <ul>
        ${tips.slice(0, 4).map((tip) => `<li>${tip}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderPresetOptions() {
  dom.presetSelect.innerHTML = `<option value="">Choose a saved preset</option>`;
  state.presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.name;
    option.textContent = preset.name;
    dom.presetSelect.appendChild(option);
  });
}

function renderInputDeviceOptions() {
  const currentValue = state.selectedInputDeviceId;
  dom.inputDeviceSelect.innerHTML = "";

  if (state.availableInputDevices.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = SYSTEM_DEFAULT_INPUT.label;
    dom.inputDeviceSelect.appendChild(option);
    dom.inputDeviceSelect.value = "";
    return;
  }

  state.availableInputDevices.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Audio Input ${index + 1}`;
    dom.inputDeviceSelect.appendChild(option);
  });

  const matchingOption = state.availableInputDevices.find((device) => device.deviceId === currentValue);
  dom.inputDeviceSelect.value = matchingOption ? currentValue : state.availableInputDevices[0].deviceId;
}

function renderLiveInputPanel() {
  renderInputDeviceOptions();
  dom.liveInputGain.value = String(state.liveInputGain);
  dom.liveInputGainValue.textContent = formatFixedNumber(state.liveInputGain);
  dom.liveInputBadge.textContent = state.liveInputActive ? "Live Input On" : "Input Idle";
  dom.liveInputBtn.textContent = state.liveInputActive ? "Stop Live Input" : "Start Live Input";
  dom.liveInputStatus.textContent = state.liveInputStatusMessage;
  dom.inputDeviceSelect.disabled = state.isRecording;
  dom.refreshDevicesBtn.disabled = state.isRecording;
  dom.liveInputBtn.disabled = !navigator.mediaDevices?.getUserMedia;
  dom.liveInputGuidance.textContent = state.liveInputActive
    ? "Live input is active. For the lowest latency, monitor through the interface headphone output or set your system output to the interface."
    : "Chrome or Edge desktop works best here. If your interface name does not appear at first, click Detect Inputs and allow microphone access so the browser can reveal device names.";
}

function renderAmpCabPanel() {
  dom.ampCabEnabled.checked = state.ampCab.enabled;
  dom.ampModelSelect.value = state.ampCab.ampModel;
  dom.cabModelSelect.value = state.ampCab.cabModel;
  dom.ampDrive.value = String(state.ampCab.drive);
  dom.ampLevel.value = String(state.ampCab.level);
  dom.ampBass.value = String(state.ampCab.bass);
  dom.ampMid.value = String(state.ampCab.mid);
  dom.ampTreble.value = String(state.ampCab.treble);
  dom.ampPresence.value = String(state.ampCab.presence);

  dom.ampDriveValue.textContent = String(state.ampCab.drive);
  dom.ampLevelValue.textContent = formatFixedNumber(state.ampCab.level);
  dom.ampBassValue.textContent = `${state.ampCab.bass} dB`;
  dom.ampMidValue.textContent = `${state.ampCab.mid} dB`;
  dom.ampTrebleValue.textContent = `${state.ampCab.treble} dB`;
  dom.ampPresenceValue.textContent = `${state.ampCab.presence} dB`;
  dom.ampCabBadge.textContent = state.ampCab.enabled ? "Rig On" : "Rig Bypassed";
  dom.ampCabStatus.textContent = state.ampCab.enabled
    ? `${getAmpModelLabel(state.ampCab.ampModel)} amp into ${getCabModelLabel(state.ampCab.cabModel)} cabinet. This fixed stage sits after the pedalboard for a more realistic guitar rig.`
    : "Amp + cabinet stage is bypassed, so the pedalboard feeds the master output directly.";
}

function renderHud() {
  const activeCount = state.effects.filter((effect) => effect.enabled).length;
  const pedalText = `${activeCount} pedal${activeCount === 1 ? "" : "s"}`;
  const sourceLabel =
    state.activeMode === "live"
      ? state.selectedInputLabel || "Live guitar input"
      : state.activeMode === "buffer"
        ? state.activeClipLabel || "Loaded clip"
        : state.activeMode === "preview"
        ? state.activeClipLabel || "Loaded clip"
        : state.activeClipLabel || "No source loaded";

  dom.sourceStat.textContent = sourceLabel;
  dom.chainStat.textContent = state.ampCab.enabled ? `${pedalText} + amp/cab` : pedalText;
  dom.presetStat.textContent = `${state.presets.length} saved preset${state.presets.length === 1 ? "" : "s"}`;
  dom.loadedClipLabel.textContent = state.activeClipLabel || "No file or take selected yet.";

  const transportLabel = state.isRecording
    ? "Recording"
    : state.activeMode === "live"
      ? "Live Input"
      : state.isPlaying
        ? "Playing"
        : "Idle";

  dom.transportBadge.textContent = transportLabel;
  dom.globalBypassBtn.textContent = state.globalBypass ? "Return To Effect Chain" : "Compare Dry Signal";
  dom.recordBtn.textContent = state.isRecording ? "Stop Recording" : "Record Take";
}

function renderAll() {
  try {
    renderChain();
    renderInspector();
    renderInsights();
    renderPresetOptions();
    renderLiveInputPanel();
    renderAmpCabPanel();
    renderHud();
  } catch (error) {
    setFatalError(`Render error: ${error.message}`);
  }
}

function setStatus(message) {
  if (dom.statusText) {
    dom.statusText.textContent = message;
  }
  if (dom.topStatusText) {
    dom.topStatusText.textContent = message;
  }
}

function serializePreset(name) {
  return {
    name,
    masterGain: Number(dom.masterGain.value),
    selectedInputDeviceId: state.selectedInputDeviceId,
    ampCab: { ...state.ampCab },
    effects: state.effects.map((effect) => ({
      type: effect.type,
      enabled: effect.enabled,
      params: { ...effect.params },
    })),
  };
}

function savePresetsToStorage() {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(state.presets));
}

function saveSettingsToStorage() {
  localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      selectedInputDeviceId: state.selectedInputDeviceId,
      liveInputGain: state.liveInputGain,
    }),
  );
}

function loadPresetsFromStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || "[]");
    state.presets = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    state.presets = [];
  }
}

function loadSettingsFromStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}");
    state.selectedInputDeviceId = typeof parsed.selectedInputDeviceId === "string" ? parsed.selectedInputDeviceId : "";
    const parsedGain = Number(parsed.liveInputGain ?? 1);
    state.liveInputGain = Number.isFinite(parsedGain) ? clamp(parsedGain, 0, 2) : 1;
  } catch (error) {
    state.selectedInputDeviceId = "";
    state.liveInputGain = 1;
  }

  state.selectedInputLabel = state.selectedInputDeviceId ? state.selectedInputLabel : SYSTEM_DEFAULT_INPUT.label;
}

function clearEffects() {
  state.effects.forEach((effect) => effect.instance.destroy());
  state.effects = [];
  state.selectedEffectId = null;
  rebuildAudioChain();
}

function applyPreset(preset) {
  clearEffects();

  preset.effects.forEach((savedEffect) => {
    state.effects.push(
      buildEffectRecord(savedEffect.type, {
        enabled: savedEffect.enabled,
        params: savedEffect.params,
      }),
    );
  });

  state.selectedEffectId = state.effects[0]?.id ?? null;
  state.ampCab = {
    ...DEFAULT_AMP_CAB_STATE,
    ...(preset.ampCab ?? {}),
  };
  if (typeof preset.selectedInputDeviceId === "string") {
    state.selectedInputDeviceId = preset.selectedInputDeviceId;
  }
  dom.masterGain.value = String(preset.masterGain ?? 0.85);
  dom.masterGainValue.textContent = Number(dom.masterGain.value).toFixed(2);

  if (state.masterGain) {
    state.masterGain.gain.value = Number(dom.masterGain.value);
  }

  syncAmpCabStage();
  rebuildAudioChain();
  renderAll();
}

function savePreset() {
  const name = dom.presetName.value.trim();
  if (!name) {
    setStatus("Give the preset a name before saving.");
    return;
  }

  const preset = serializePreset(name);
  const existingIndex = state.presets.findIndex((item) => item.name === name);

  if (existingIndex >= 0) {
    state.presets[existingIndex] = preset;
  } else {
    state.presets.push(preset);
  }

  savePresetsToStorage();
  renderAll();
  setStatus(`Preset "${name}" saved.`);
}

async function loadSelectedPreset() {
  const name = dom.presetSelect.value;
  const preset = state.presets.find((item) => item.name === name);

  if (!preset) {
    setStatus("Choose a preset to load.");
    return;
  }

  applyPreset(preset);
  await refreshInputDevices({ requestPermission: false }).catch(() => {
    /* no-op */
  });
  setStatus(`Preset "${preset.name}" loaded.`);
}

function deleteSelectedPreset() {
  const name = dom.presetSelect.value;
  const index = state.presets.findIndex((item) => item.name === name);

  if (index === -1) {
    setStatus("Choose a preset to delete.");
    return;
  }

  state.presets.splice(index, 1);
  savePresetsToStorage();
  renderAll();
  setStatus(`Preset "${name}" deleted.`);
}

function disconnectBufferSource() {
  if (!state.bufferSource) {
    return;
  }

  try {
    state.bufferSource.stop();
  } catch (error) {
    /* no-op */
  }

  try {
    state.bufferSource.disconnect();
  } catch (error) {
    /* no-op */
  }

  state.bufferSource = null;
  state.isPlaying = false;
  if (state.activeMode === "buffer") {
    state.activeMode = null;
  }
}

function stopPreviewPlayback(options = {}) {
  const { resetPosition = true } = options;

  if (!dom.takePreview) {
    return;
  }

  if (!dom.takePreview.paused) {
    dom.takePreview.pause();
  }

  if (resetPosition) {
    dom.takePreview.currentTime = 0;
  }
}

function buildPermissionConstraints() {
  return {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  };
}

function getAudioAccessHelpMessage() {
  if (!window.isSecureContext) {
    return "Audio input requires a secure page. Run this project from http://localhost and open it in Chrome or Edge.";
  }

  return "";
}

function buildLiveInputConstraints(deviceId = "") {
  const audio = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: { ideal: 2 },
    latency: { ideal: 0.01 },
  };

  if (deviceId) {
    audio.deviceId = { exact: deviceId };
  }

  return { audio };
}

async function refreshInputDevices(options = {}) {
  const { requestPermission = false } = options;
  const contextWarning = getAudioAccessHelpMessage();

  if (contextWarning) {
    state.availableInputDevices = [getDefaultInputOption()];
    state.selectedInputDeviceId = "";
    state.selectedInputLabel = SYSTEM_DEFAULT_INPUT.label;
    setLiveInputStatus(contextWarning);
    renderAll();
    return;
  }

  if (!navigator.mediaDevices?.enumerateDevices) {
    setLiveInputStatus("This browser does not support selecting audio interface inputs.");
    renderAll();
    return;
  }

  if (requestPermission && !state.devicePermissionGranted && navigator.mediaDevices.getUserMedia) {
    const permissionStream = await navigator.mediaDevices.getUserMedia(buildPermissionConstraints());
    state.devicePermissionGranted = true;
    permissionStream.getTracks().forEach((track) => track.stop());
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const detectedInputs = devices
    .filter((device) => device.kind === "audioinput" && device.deviceId !== "default" && device.deviceId !== "communications")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Audio Input ${index + 1}`,
    }));
  const labelsAreGeneric = detectedInputs.length > 0 && detectedInputs.every((device) => device.label.startsWith("Audio Input "));
  state.availableInputDevices = [getDefaultInputOption(), ...detectedInputs];

  if (detectedInputs.some((device) => device.label && !device.label.startsWith("Audio Input "))) {
    state.devicePermissionGranted = true;
  }

  if (detectedInputs.length === 0) {
    if (state.liveInputActive) {
      stopLiveInput({ releaseStream: true, preserveStatus: true, silent: true });
    }
    state.selectedInputDeviceId = "";
    state.selectedInputLabel = SYSTEM_DEFAULT_INPUT.label;
    setLiveInputStatus(
      state.devicePermissionGranted
        ? "No named interface was detected. You can still try System Default Input, or reconnect the interface and click Detect Inputs again."
        : "Click Detect Inputs and allow microphone access so the browser can reveal your interface name.",
    );
    renderAll();
    return;
  }

  const previousSelection = state.selectedInputDeviceId;
  const selectedDevice =
    state.availableInputDevices.find((device) => device.deviceId === state.selectedInputDeviceId) ?? getDefaultInputOption();

  state.selectedInputDeviceId = selectedDevice.deviceId;
  state.selectedInputLabel = selectedDevice.label;
  saveSettingsToStorage();

  if (previousSelection && previousSelection !== selectedDevice.deviceId) {
    if (state.liveInputActive) {
      stopLiveInput({ releaseStream: true, preserveStatus: true, silent: true });
    }
    setLiveInputStatus(`Selected interface is unavailable. Fell back to ${selectedDevice.label}. Choose an input and press Start Live Input.`);
  } else if (!state.liveInputActive && !state.isRecording) {
    setLiveInputStatus(
      !state.devicePermissionGranted && labelsAreGeneric
        ? "Audio inputs were found, but the browser is still hiding their real names. Click Detect Inputs and allow microphone access to reveal your interface."
        : `Selected input: ${selectedDevice.label}. Press Start Live Input when ready.`,
    );
  }

  renderAll();
}

function disconnectLiveInputChain() {
  if (!state.liveInputGainNode || !state.liveInputActive) {
    return;
  }

  try {
    state.liveInputGainNode.disconnect(state.sourceBus);
  } catch (error) {
    /* no-op */
  }

  state.liveInputActive = false;
}

function cleanupLiveInputGraph(options = {}) {
  const { stopTracks = true } = options;

  disconnectLiveInputChain();

  if (state.liveInputSource) {
    try {
      state.liveInputSource.disconnect();
    } catch (error) {
      /* no-op */
    }
  }

  if (state.liveInputGainNode) {
    try {
      state.liveInputGainNode.disconnect();
    } catch (error) {
      /* no-op */
    }
  }

  if (stopTracks && state.liveInputStream) {
    state.liveInputStream.getTracks().forEach((track) => track.stop());
  }

  state.liveInputStream = stopTracks ? null : state.liveInputStream;
  state.liveInputSource = stopTracks ? null : state.liveInputSource;
  state.liveInputGainNode = stopTracks ? null : state.liveInputGainNode;
  state.liveInputStreamDeviceId = stopTracks ? "" : state.liveInputStreamDeviceId;
}

async function ensureLiveInputStream(options = {}) {
  const { restart = false } = options;

  await ensureAudioContext();

  const contextWarning = getAudioAccessHelpMessage();
  if (contextWarning) {
    throw new Error(contextWarning);
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Live guitar input is not supported in this browser.");
  }

  if (state.availableInputDevices.length === 0) {
    await refreshInputDevices({ requestPermission: true });
  }

  if (state.availableInputDevices.length === 0) {
    throw new Error("No audio inputs are currently available.");
  }

  const deviceId = state.selectedInputDeviceId;
  const shouldRestart = restart || !state.liveInputStream || state.liveInputStreamDeviceId !== deviceId;
  if (!shouldRestart) {
    return state.liveInputStream;
  }

  cleanupLiveInputGraph({ stopTracks: true });
  let stream;

  try {
    stream = await navigator.mediaDevices.getUserMedia(buildLiveInputConstraints(deviceId));
  } catch (error) {
    if (!deviceId) {
      throw error;
    }

    stream = await navigator.mediaDevices.getUserMedia(buildLiveInputConstraints());
    state.selectedInputDeviceId = "";
    state.selectedInputLabel = SYSTEM_DEFAULT_INPUT.label;
    setLiveInputStatus(
      "The selected interface could not be opened with browser constraints, so the app fell back to System Default Input.",
    );
    saveSettingsToStorage();
  }

  state.devicePermissionGranted = true;
  state.liveInputStream = stream;
  state.liveInputStreamDeviceId = state.selectedInputDeviceId;
  state.liveInputSource = state.audioContext.createMediaStreamSource(stream);
  state.liveInputGainNode = state.audioContext.createGain();
  state.liveInputGainNode.gain.value = state.liveInputGain;
  state.liveInputSource.connect(state.liveInputGainNode);

  await refreshInputDevices({ requestPermission: false });
  return stream;
}

async function handleInputDeviceSelection(deviceId) {
  state.selectedInputDeviceId = deviceId;
  const selectedDevice = state.availableInputDevices.find((device) => device.deviceId === deviceId);
  state.selectedInputLabel = selectedDevice?.label ?? SYSTEM_DEFAULT_INPUT.label;
  saveSettingsToStorage();

  if (state.isRecording) {
    setLiveInputStatus(`Selected input saved. The new device will be used after recording stops.`);
    renderAll();
    return;
  }

  if (state.liveInputActive) {
    await ensureLiveInputStream({ restart: true });
    state.liveInputGainNode.connect(state.sourceBus);
    state.liveInputActive = true;
    state.activeMode = "live";
    state.isPlaying = true;
    setLiveInputStatus(`Live input switched to ${state.selectedInputLabel}. Monitor through the interface for the lowest latency.`);
    setStatus(`Live guitar input switched to ${state.selectedInputLabel}.`);
  } else {
    cleanupLiveInputGraph({ stopTracks: true });
    setLiveInputStatus(`Selected input: ${state.selectedInputLabel}. Start live input when ready.`);
  }

  renderAll();
}

async function startLiveInput() {
  ensurePreviewRouting();
  stopPreviewPlayback();
  disconnectBufferSource();
  await ensureLiveInputStream({ restart: state.liveInputStreamDeviceId !== state.selectedInputDeviceId });

  if (!state.liveInputGainNode) {
    throw new Error("Could not create the live input gain stage.");
  }

  if (!state.liveInputActive) {
    state.liveInputGainNode.connect(state.sourceBus);
    state.liveInputActive = true;
  }

  state.activeMode = "live";
  state.isPlaying = true;
  setLiveInputStatus(`Live input active from ${state.selectedInputLabel}. For the lowest latency, monitor through the interface headphone output or set your system output to the interface.`);
  setStatus("Live guitar input is running through the pedalboard and amp/cab stage.");
  renderAll();
}

async function authorizeInputAccess() {
  await ensureAudioContext();
  setStatus("Requesting browser audio permission...");
  await refreshInputDevices({ requestPermission: true });
  setStatus("Audio access ready. Choose an input and press Start Live Input, or upload a clip.");
}

function stopLiveInput(options = {}) {
  const { releaseStream = true, preserveStatus = false, silent = false } = options;

  disconnectLiveInputChain();

  if (releaseStream && !state.isRecording) {
    cleanupLiveInputGraph({ stopTracks: true });
  }

  if (state.activeMode === "live") {
    state.activeMode = null;
  }

  if (!state.bufferSource && dom.takePreview.paused) {
    state.isPlaying = false;
  }

  if (!preserveStatus) {
    setLiveInputStatus(`Live input stopped. Selected input: ${state.selectedInputLabel || "Default input"}.`);
  }

  if (!silent) {
    setStatus("Live guitar input stopped.");
  }

  renderAll();
}

async function playLoadedAudio() {
  if (!state.audioBuffer && !dom.takePreview.src) {
    setStatus("Upload or record a clip before pressing play.");
    return;
  }

  await ensureAudioContext();
  ensurePreviewRouting();
  stopPreviewPlayback();
  disconnectBufferSource();
  const hadLiveInput = state.liveInputActive;
  disconnectLiveInputChain();
  if (hadLiveInput) {
    setLiveInputStatus(`Selected input: ${state.selectedInputLabel}. Start live input when ready.`);
    renderLiveInputPanel();
  }

  if (!state.audioBuffer && dom.takePreview.src) {
    dom.takePreview.currentTime = 0;
    await dom.takePreview.play();
    return;
  }

  const source = state.audioContext.createBufferSource();
  source.buffer = state.audioBuffer;
  source.loop = dom.loopToggle.checked;
  source.connect(state.sourceBus);
  source.onended = () => {
    if (state.bufferSource === source) {
      state.bufferSource = null;
      state.isPlaying = false;
      if (state.activeMode === "buffer") {
        state.activeMode = null;
      }
      renderHud();
    }
  };

  source.start();
  state.bufferSource = source;
  state.isPlaying = true;
  state.activeMode = "buffer";
  setStatus("Playing loaded audio through the current pedalboard.");
  renderHud();
}

async function toggleLiveInput() {
  if (state.liveInputActive) {
    stopLiveInput({ releaseStream: !state.isRecording });
    return;
  }

  await startLiveInput();
}

function stopTransport() {
  stopPreviewPlayback();
  disconnectBufferSource();
  stopLiveInput({ releaseStream: !state.isRecording, preserveStatus: true, silent: true });
  setStatus("Transport stopped.");
  renderHud();
}

async function decodeAudioBlob(blob, label) {
  await ensureAudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const decoded = await state.audioContext.decodeAudioData(arrayBuffer.slice(0));
  state.audioBuffer = decoded;
  state.activeClipLabel = label;
  setStatus(`Loaded "${label}". Use the preview controls or the play button to hear it through the effect chain.`);
  renderHud();
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  stopPreviewPlayback();

  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
  }

  state.previewUrl = URL.createObjectURL(file);
  dom.takePreview.src = state.previewUrl;
  dom.takePreview.classList.remove("hidden");

  try {
    await decodeAudioBlob(file, file.name);
  } catch (error) {
    state.audioBuffer = null;
    state.activeClipLabel = file.name;
    setStatus(`Loaded "${file.name}" into the preview player. Buffer playback is unavailable in this browser, but the preview controls still run through the effect chain.`);
    renderHud();
  }
}

function pickRecorderMimeType() {
  const options = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return options.find((option) => window.MediaRecorder?.isTypeSupported(option)) || "";
}

async function toggleRecording() {
  if (state.isRecording) {
    state.mediaRecorder.stop();
    return;
  }

  const stream = await ensureLiveInputStream();
  ensurePreviewRouting();
  stopPreviewPlayback();
  disconnectBufferSource();
  const mimeType = pickRecorderMimeType();
  state.recorderChunks = [];
  state.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

  state.mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      state.recorderChunks.push(event.data);
    }
  };

  state.mediaRecorder.onstop = async () => {
    state.isRecording = false;
    const blob = new Blob(state.recorderChunks, { type: state.mediaRecorder.mimeType || "audio/webm" });
    const label = `Recorded take ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;

    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }

    state.previewUrl = URL.createObjectURL(blob);
    dom.takePreview.src = state.previewUrl;
    dom.takePreview.classList.remove("hidden");

    try {
      await decodeAudioBlob(blob, label);
      setStatus("Recording finished and loaded into the player.");
    } catch (error) {
      state.audioBuffer = null;
      setStatus("Recording finished. Buffer playback is unavailable in this browser, but the preview controls still run through the effect chain.");
      state.activeClipLabel = label;
      renderHud();
    }

    setLiveInputStatus(
      state.liveInputActive
        ? `Live input active from ${state.selectedInputLabel}. For the lowest latency, monitor through the interface headphone output or set your system output to the interface.`
        : `Selected input: ${state.selectedInputLabel}. Start live input when ready.`,
    );
    if (!state.liveInputActive) {
      cleanupLiveInputGraph({ stopTracks: true });
    }
    renderAll();
  };

  state.mediaRecorder.start();
  state.isRecording = true;
  setLiveInputStatus(`Recording from ${state.selectedInputLabel}. The take will feed back into the same pedalboard when playback starts.`);
  setStatus("Recording from the selected live input. Press again to stop.");
  renderHud();
}

function moveEffect(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) {
    return;
  }

  const fromIndex = state.effects.findIndex((effect) => effect.id === draggedId);
  const toIndex = state.effects.findIndex((effect) => effect.id === targetId);

  if (fromIndex === -1 || toIndex === -1) {
    return;
  }

  const [moved] = state.effects.splice(fromIndex, 1);
  state.effects.splice(toIndex, 0, moved);
  rebuildAudioChain();
  renderAll();
  setStatus("Signal chain reordered.");
}

function installChainInteractions() {
  if (chainInteractionsInstalled) {
    return;
  }
  chainInteractionsInstalled = true;

  dom.chainList.addEventListener("dragover", (event) => {
    event.preventDefault();
    const activeCard = dom.chainList.querySelector(".dragging");
    const overCard = event.target.closest(".effect-card");

    if (!activeCard || !overCard || activeCard === overCard) {
      return;
    }
  });

  dom.chainList.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggedCard = dom.chainList.querySelector(".dragging");
    const targetCard = event.target.closest(".effect-card");

    if (!draggedCard || !targetCard) {
      return;
    }

    moveEffect(draggedCard.dataset.effectId, targetCard.dataset.effectId);
  });

  dom.chainList.addEventListener("click", (event) => {
    const addTarget = event.target.closest("[data-add-effect]");
    const toggleTarget = event.target.closest("[data-toggle-effect]");
    const removeTarget = event.target.closest("[data-remove-effect]");
    const selectTarget = event.target.closest("[data-select-effect]");

    if (addTarget) {
      addEffect(addTarget.dataset.addEffect);
      return;
    }

    if (toggleTarget) {
      toggleEffect(toggleTarget.dataset.toggleEffect);
      return;
    }

    if (removeTarget) {
      removeEffect(removeTarget.dataset.removeEffect);
      return;
    }

    if (selectTarget) {
      state.selectedEffectId = selectTarget.dataset.selectEffect;
      renderAll();
    }
  });

  dom.libraryGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-effect]");
    if (!button) {
      return;
    }
    addEffect(button.dataset.addEffect);
  });
}

function resizeCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
}

function drawWaveform() {
  const canvas = dom.waveCanvas;
  const context = canvas.getContext("2d");
  resizeCanvas(canvas);
  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(5, 18, 25, 0.95)";
  context.fillRect(0, 0, width, height);

  if (!state.analyserWave) {
    return;
  }

  const buffer = new Uint8Array(state.analyserWave.fftSize);
  state.analyserWave.getByteTimeDomainData(buffer);

  context.lineWidth = 2.5 * (window.devicePixelRatio || 1);
  context.strokeStyle = "#68d0ff";
  context.beginPath();

  for (let i = 0; i < buffer.length; i += 1) {
    const x = (i / (buffer.length - 1)) * width;
    const y = (buffer[i] / 255) * height;
    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();
}

function drawSpectrum() {
  const canvas = dom.spectrumCanvas;
  const context = canvas.getContext("2d");
  resizeCanvas(canvas);
  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(5, 18, 25, 0.95)";
  context.fillRect(0, 0, width, height);

  if (!state.analyserSpectrum) {
    return;
  }

  const buffer = new Uint8Array(state.analyserSpectrum.frequencyBinCount);
  state.analyserSpectrum.getByteFrequencyData(buffer);

  const barWidth = width / buffer.length;
  for (let i = 0; i < buffer.length; i += 3) {
    const magnitude = buffer[i] / 255;
    const barHeight = magnitude * height;
    context.fillStyle = `rgba(${255 - i / 3}, ${138 + i / 8}, ${61 + i / 2}, 0.88)`;
    context.fillRect(i * barWidth, height - barHeight, barWidth * 2.2, barHeight);
  }
}

function startVisualizers() {
  if (state.renderLoopStarted) {
    return;
  }

  state.renderLoopStarted = true;

  const frame = () => {
    drawWaveform();
    drawSpectrum();
    window.requestAnimationFrame(frame);
  };

  frame();
}

function registerEvents() {
  if (eventsRegistered) {
    return;
  }
  eventsRegistered = true;

  dom.wakeAudioBtn.addEventListener("click", async () => {
    try {
      setStatus("Waking the audio engine...");
      await ensureAudioContext();
      refreshInputDevices({ requestPermission: false }).catch((error) => {
        setLiveInputStatus(`Could not inspect audio inputs: ${error.message}`);
        renderAll();
      });
    } catch (error) {
      setFatalError(`Could not wake the audio engine: ${error.message}`);
    }
  });

  dom.globalBypassBtn.addEventListener("click", () => {
    state.globalBypass = !state.globalBypass;
    rebuildAudioChain();
    renderHud();
    setStatus(state.globalBypass ? "Dry signal comparison engaged." : "Returned to processed effect chain.");
  });

  dom.fileInput.addEventListener("change", (event) => {
    handleFileUpload(event).catch((error) => {
      setStatus(`Could not load file: ${error.message}`);
    });
  });

  dom.playBtn.addEventListener("click", () => {
    playLoadedAudio().catch((error) => {
      setStatus(`Playback error: ${error.message}`);
    });
  });

  dom.refreshDevicesBtn.addEventListener("click", () => {
    setStatus("Detecting available audio inputs...");
    refreshInputDevices({ requestPermission: true }).catch((error) => {
      setLiveInputStatus(`Could not refresh audio devices: ${error.message}`);
      renderAll();
    });
  });

  dom.authorizeInputBtn.addEventListener("click", () => {
    authorizeInputAccess().catch((error) => {
      setFatalError(`Could not authorize audio input: ${error.message}`);
    });
  });

  dom.inputDeviceSelect.addEventListener("change", (event) => {
    handleInputDeviceSelection(event.target.value).catch((error) => {
      setLiveInputStatus(`Could not switch input device: ${error.message}`);
      renderAll();
    });
  });

  dom.liveInputBtn.addEventListener("click", () => {
    toggleLiveInput().catch((error) => {
      setLiveInputStatus(`Live input error: ${error.message}`);
      setStatus(`Live input error: ${error.message}`);
      renderAll();
    });
  });

  dom.liveInputGain.addEventListener("input", (event) => {
    state.liveInputGain = Number(event.target.value);
    if (state.liveInputGainNode) {
      state.liveInputGainNode.gain.value = state.liveInputGain;
    }
    saveSettingsToStorage();
    renderLiveInputPanel();
  });

  dom.ampCabEnabled.addEventListener("change", (event) => {
    updateAmpCabSetting("enabled", event.target.checked);
  });

  dom.ampModelSelect.addEventListener("change", (event) => {
    updateAmpCabSetting("ampModel", event.target.value);
  });

  dom.cabModelSelect.addEventListener("change", (event) => {
    updateAmpCabSetting("cabModel", event.target.value);
  });

  [
    [dom.ampDrive, "drive"],
    [dom.ampLevel, "level"],
    [dom.ampBass, "bass"],
    [dom.ampMid, "mid"],
    [dom.ampTreble, "treble"],
    [dom.ampPresence, "presence"],
  ].forEach(([input, key]) => {
    input.addEventListener("input", (event) => {
      updateAmpCabSetting(key, Number(event.target.value));
    });
  });

  dom.recordBtn.addEventListener("click", () => {
    toggleRecording().catch((error) => {
      state.isRecording = false;
      setStatus(`Recording error: ${error.message}`);
      renderHud();
    });
  });

  dom.stopBtn.addEventListener("click", stopTransport);

  dom.takePreview.addEventListener("play", () => {
    ensureAudioContext()
      .then(() => {
        ensurePreviewRouting();
        disconnectBufferSource();
        const hadLiveInput = state.liveInputActive;
        disconnectLiveInputChain();
        if (hadLiveInput) {
          setLiveInputStatus(`Selected input: ${state.selectedInputLabel}. Start live input when ready.`);
        }
        state.activeMode = "preview";
        state.isPlaying = true;
        setStatus("Previewing the loaded clip through the current pedalboard and amp/cab stage.");
        renderAll();
      })
      .catch((error) => {
        dom.takePreview.pause();
        setStatus(`Preview playback error: ${error.message}`);
      });
  });

  dom.takePreview.addEventListener("pause", () => {
    if (state.activeMode === "preview") {
      state.activeMode = null;
      state.isPlaying = false;
      renderHud();
    }
  });

  dom.takePreview.addEventListener("ended", () => {
    if (state.activeMode === "preview") {
      state.activeMode = null;
    }
    state.isPlaying = false;
    renderHud();
  });

  dom.masterGain.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    dom.masterGainValue.textContent = value.toFixed(2);
    if (state.masterGain) {
      state.masterGain.gain.value = value;
    }
  });

  dom.savePresetBtn.addEventListener("click", savePreset);
  dom.loadPresetBtn.addEventListener("click", loadSelectedPreset);
  dom.deletePresetBtn.addEventListener("click", deleteSelectedPreset);

  if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener("devicechange", () => {
      refreshInputDevices({ requestPermission: false }).catch(() => {
        /* no-op */
      });
    });
  }

  window.addEventListener("resize", () => {
    drawWaveform();
    drawSpectrum();
  });
}

function seedDefaultBoard() {
  ["distortion", "delay", "reverb"].forEach((type) => {
    state.effects.push(buildEffectRecord(type));
  });

  state.selectedEffectId = state.effects[0]?.id ?? null;
}

async function init() {
  registerEvents();
  installChainInteractions();
  loadPresetsFromStorage();
  loadSettingsFromStorage();
  setStatus("1. Click Wake Audio Engine. 2. Click Authorize Input Access for guitar, or upload a clip.");
  renderLibrary();
  seedDefaultBoard();
  renderAll();
  await refreshInputDevices({ requestPermission: false }).catch(() => {
    setLiveInputStatus("Choose an audio interface or your default input, then start live input when ready.");
  });
  renderAll();
}

window.addEventListener("error", (event) => {
  const message = event?.error?.message || event.message || "Unknown error";
  setFatalError(`App error: ${message}`);
});

window.addEventListener("unhandledrejection", (event) => {
  const message = event?.reason?.message || String(event.reason || "Unknown promise error");
  setFatalError(`App error: ${message}`);
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      setFatalError(`Startup error: ${error.message}`);
    });
  });
} else {
  init().catch((error) => {
    setFatalError(`Startup error: ${error.message}`);
  });
}
