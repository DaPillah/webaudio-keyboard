const PITCH_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const EXAMPLES = [
  "0, 2, 4, 7",
  "0, 1, 4, 6",
  "0, 3, 5, 8",
  "0, 2, 5, 9",
  "0, 1, 4, 7, 9",
];

const state = {
  audioContext: null,
  activeNodes: [],
  noteTimers: [],
  playbackIndex: -1,
  noteElements: [],
  composition: null,
  isPlaying: false,
};

const refs = {
  form: document.getElementById("composer-form"),
  message: document.getElementById("message"),
  pitchClassInput: document.getElementById("pitch-class-input"),
  stepCount: document.getElementById("step-count"),
  tempo: document.getElementById("tempo"),
  baseOctave: document.getElementById("base-octave"),
  seed: document.getElementById("seed"),
  generateButton: document.getElementById("generate-button"),
  playButton: document.getElementById("play-button"),
  stopButton: document.getElementById("stop-button"),
  exampleButton: document.getElementById("example-button"),
  primeForm: document.getElementById("prime-form"),
  primeNames: document.getElementById("prime-names"),
  operationChain: document.getElementById("operation-chain"),
  totalNotes: document.getElementById("total-notes"),
  playbackRegister: document.getElementById("playback-register"),
  history: document.getElementById("history"),
  timeline: document.getElementById("timeline"),
};

function mod12(value) {
  return ((value % 12) + 12) % 12;
}

function midiToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

function pitchOnly(pc) {
  return PITCH_NAMES[pc];
}

function sequenceLabel(sequence) {
  return sequence.map((pc) => pc.toString()).join(" ");
}

function parsePitchClasses(rawValue) {
  const tokens = rawValue
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    throw new Error("Enter at least one pitch class.");
  }

  return tokens.map((token) => {
    const value = Number(token);

    if (!Number.isInteger(value)) {
      throw new Error(`"${token}" is not a whole-number pitch class.`);
    }

    return mod12(value);
  });
}

function transpose(sequence, interval) {
  return sequence.map((pc) => mod12(pc + interval));
}

function invert(sequence, axis = 0) {
  return sequence.map((pc) => mod12(axis - pc));
}

function retrograde(sequence) {
  return [...sequence].reverse();
}

function mulberry32(seed) {
  let current = seed >>> 0;

  return function next() {
    current += 0x6d2b79f5;
    let t = current;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(rawSeed) {
  let hash = 2166136261;

  for (let index = 0; index < rawSeed.length; index += 1) {
    hash ^= rawSeed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandomSource(seedText) {
  if (!seedText.trim()) {
    return {
      next: () => Math.random(),
      description: "fresh randomness",
    };
  }

  const seed = stringToSeed(seedText.trim());
  const seededRandom = mulberry32(seed);

  return {
    next: () => seededRandom(),
    description: `seed "${seedText.trim()}"`,
  };
}

function randomInt(randomSource, min, max) {
  return Math.floor(randomSource.next() * (max - min + 1)) + min;
}

function chooseOperation(randomSource) {
  const roll = randomInt(randomSource, 0, 2);
  return ["transpose", "invert", "retrograde"][roll];
}

function applyRandomOperation(sequence, randomSource) {
  const operation = chooseOperation(randomSource);

  if (operation === "transpose") {
    const interval = randomInt(randomSource, 1, 11);
    return {
      label: `T${interval}`,
      description: `Transpose every pitch class up ${interval} semitone${interval === 1 ? "" : "s"}.`,
      sequence: transpose(sequence, interval),
    };
  }

  if (operation === "invert") {
    const axis = randomInt(randomSource, 0, 11);
    return {
      label: `I${axis}`,
      description: `Invert the sequence around pitch-class axis ${axis}.`,
      sequence: invert(sequence, axis),
    };
  }

  return {
    label: "R",
    description: "Reverse the order of the pitch-class sequence.",
    sequence: retrograde(sequence),
  };
}

function mapPitchClassesToMidi(sequence, baseOctave) {
  const targetCenter = 12 * (baseOctave + 1);
  const midiSequence = [];
  let previousMidi = null;

  sequence.forEach((pc) => {
    const candidates = [];

    for (let octave = 1; octave <= 7; octave += 1) {
      const midi = 12 * (octave + 1) + pc;
      if (midi >= 36 && midi <= 96) {
        candidates.push(midi);
      }
    }

    const chosen = candidates.reduce((best, candidate) => {
      if (best === null) {
        return candidate;
      }

      const candidateDistance =
        previousMidi === null
          ? Math.abs(candidate - (targetCenter + pc))
          : Math.abs(candidate - previousMidi);

      const bestDistance =
        previousMidi === null
          ? Math.abs(best - (targetCenter + pc))
          : Math.abs(best - previousMidi);

      if (candidateDistance < bestDistance) {
        return candidate;
      }

      if (
        candidateDistance === bestDistance &&
        Math.abs(candidate - (targetCenter + pc)) < Math.abs(best - (targetCenter + pc))
      ) {
        return candidate;
      }

      return best;
    }, null);

    previousMidi = chosen;
    midiSequence.push(chosen);
  });

  return midiSequence;
}

function buildComposition(primeForm, stepCount, baseOctave, randomSource) {
  const steps = [
    {
      label: "P0",
      description: "Prime form entered by the user.",
      sequence: [...primeForm],
    },
  ];

  let current = [...primeForm];

  for (let index = 0; index < stepCount; index += 1) {
    const nextStep = applyRandomOperation(current, randomSource);
    current = nextStep.sequence;
    steps.push(nextStep);
  }

  const flattenedPitchClasses = steps.flatMap((step) => step.sequence);
  const midiSequence = mapPitchClassesToMidi(flattenedPitchClasses, baseOctave);

  return {
    primeForm,
    steps,
    flattenedPitchClasses,
    midiSequence,
  };
}

function setMessage(text, isError = false) {
  refs.message.textContent = text;
  refs.message.style.color = isError ? "#8f1f1f" : "";
}

function createChip(pc) {
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.innerHTML = `<strong>${pc}</strong><small>${pitchOnly(pc)}</small>`;
  return chip;
}

function renderHistory(steps) {
  refs.history.innerHTML = "";

  steps.forEach((step, index) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const heading = document.createElement("h3");
    heading.textContent = `${index}. ${step.label}`;

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = step.description;

    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    step.sequence.forEach((pc) => chipRow.appendChild(createChip(pc)));

    card.append(heading, meta, chipRow);
    refs.history.appendChild(card);
  });
}

function renderTimeline(steps) {
  refs.timeline.innerHTML = "";
  state.noteElements = [];

  let globalIndex = 0;

  steps.forEach((step, stepIndex) => {
    const row = document.createElement("article");
    row.className = "timeline-row";

    const header = document.createElement("div");
    header.className = "timeline-row-header";

    const title = document.createElement("strong");
    title.textContent = `${stepIndex === 0 ? "Prime" : `Step ${stepIndex}`} - ${step.label}`;

    const subtitle = document.createElement("span");
    subtitle.textContent = sequenceLabel(step.sequence);

    header.append(title, subtitle);

    const strip = document.createElement("div");
    strip.className = "note-strip";

    step.sequence.forEach((pc) => {
      const note = document.createElement("div");
      note.className = "note";
      note.dataset.noteIndex = globalIndex;
      note.innerHTML = `<strong>${pitchOnly(pc)}</strong><span>PC ${pc}</span>`;
      strip.appendChild(note);
      state.noteElements.push(note);
      globalIndex += 1;
    });

    row.append(header, strip);
    refs.timeline.appendChild(row);
  });
}

function renderComposition(composition, seedDescription, baseOctave) {
  refs.primeForm.textContent = sequenceLabel(composition.primeForm);
  refs.primeNames.textContent = composition.primeForm.map((pc) => pitchOnly(pc)).join(" ");
  refs.operationChain.textContent = composition.steps.map((step) => step.label).join(" -> ");
  refs.totalNotes.textContent = composition.flattenedPitchClasses.length.toString();
  refs.playbackRegister.textContent = `Playback voiced near octave ${baseOctave} with ${seedDescription}.`;
  renderHistory(composition.steps);
  renderTimeline(composition.steps);
}

function clearPlaybackHighlights() {
  state.noteElements.forEach((note) => note.classList.remove("active"));
  state.playbackIndex = -1;
}

function stopPlayback() {
  state.noteTimers.forEach((timer) => clearTimeout(timer));
  state.noteTimers = [];

  state.activeNodes.forEach(({ oscillator, gainNode }) => {
    try {
      oscillator.stop();
    } catch (error) {
      // Ignore stop calls on oscillators that already ended.
    }

    oscillator.disconnect();
    gainNode.disconnect();
  });

  state.activeNodes = [];
  state.isPlaying = false;
  refs.playButton.disabled = false;
  refs.generateButton.disabled = false;
  clearPlaybackHighlights();
}

async function ensureAudioContext() {
  if (!state.audioContext) {
    state.audioContext = new AudioContext();
  }

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }

  return state.audioContext;
}

async function playComposition() {
  if (!state.composition || state.isPlaying) {
    return;
  }

  const tempo = Number(refs.tempo.value);
  if (!Number.isFinite(tempo) || tempo <= 0) {
    setMessage("Tempo must be a positive number before playback can begin.", true);
    return;
  }

  const audioContext = await ensureAudioContext();
  const secondsPerNote = 60 / tempo;
  const startTime = audioContext.currentTime + 0.08;

  stopPlayback();
  state.isPlaying = true;
  refs.playButton.disabled = true;
  refs.generateButton.disabled = true;

  state.composition.midiSequence.forEach((midiNote, index) => {
    const noteStart = startTime + index * secondsPerNote;
    const noteEnd = noteStart + secondsPerNote * 0.86;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = index % 5 === 0 ? "sawtooth" : "triangle";
    oscillator.frequency.value = midiToFrequency(midiNote);

    gainNode.gain.setValueAtTime(0.0001, noteStart);
    gainNode.gain.exponentialRampToValueAtTime(0.11, noteStart + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);

    state.activeNodes.push({ oscillator, gainNode });

    const highlightTimer = window.setTimeout(() => {
      clearPlaybackHighlights();
      const noteElement = state.noteElements[index];
      if (noteElement) {
        noteElement.classList.add("active");
      }
      state.playbackIndex = index;
    }, Math.max(0, (noteStart - audioContext.currentTime) * 1000));

    state.noteTimers.push(highlightTimer);
  });

  const cleanupTimer = window.setTimeout(() => {
    stopPlayback();
    setMessage("Playback finished.");
  }, state.composition.midiSequence.length * secondsPerNote * 1000 + 200);

  state.noteTimers.push(cleanupTimer);
}

function generateCompositionFromForm() {
  stopPlayback();

  try {
    const primeForm = parsePitchClasses(refs.pitchClassInput.value);
    const stepCount = Number(refs.stepCount.value);
    const baseOctave = Number(refs.baseOctave.value);

    if (!Number.isInteger(stepCount) || stepCount < 1 || stepCount > 24) {
      throw new Error("Transform steps must be an integer between 1 and 24.");
    }

    if (!Number.isInteger(baseOctave) || baseOctave < 2 || baseOctave > 6) {
      throw new Error("Base octave must be an integer between 2 and 6.");
    }

    const randomSource = createRandomSource(refs.seed.value);
    state.composition = buildComposition(primeForm, stepCount, baseOctave, randomSource);
    renderComposition(state.composition, randomSource.description, baseOctave);
    setMessage(
      `Generated ${state.composition.flattenedPitchClasses.length} notes from ${randomSource.description}.`
    );
  } catch (error) {
    state.composition = null;
    refs.history.innerHTML = "";
    refs.timeline.innerHTML = "";
    clearPlaybackHighlights();
    setMessage(error.message, true);
  }
}

function pickRandomExample() {
  const example = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
  refs.pitchClassInput.value = example;
  refs.seed.value = "";
  generateCompositionFromForm();
}

refs.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateCompositionFromForm();
});

refs.playButton.addEventListener("click", async () => {
  if (!state.composition) {
    generateCompositionFromForm();
  }

  await playComposition();
});

refs.stopButton.addEventListener("click", () => {
  stopPlayback();
  setMessage("Playback stopped.");
});

refs.exampleButton.addEventListener("click", () => {
  pickRandomExample();
});

generateCompositionFromForm();
