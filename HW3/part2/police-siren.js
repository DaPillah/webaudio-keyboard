const playButton = document.getElementById("play-siren");
const stopButton = document.getElementById("stop-siren");
const wailButton = document.getElementById("mode-wail");
const yelpButton = document.getElementById("mode-yelp");
const statusLabel = document.getElementById("siren-status");

const SWEEP_RATES = {
  wail: 0.1,
  yelp: 3,
};

const SIREN_CONFIG = {
  carrierBaseHz: 700,
  carrierDepthHz: 400,
  hornDrive: 4,
  clipThreshold: 0.55,
  hornCenterHz: 1500,
  hornQ: 8,
  directLevel: 0.52,
  wetLevel: 0.28,
  feedbackLevel: 0.08,
  outputLevel: 0.55,
  delayTimes: [0.11, 0.17, 0.29],
};

let currentMode = "wail";
let currentContext = null;
let currentPatch = null;

playButton.addEventListener("click", async () => {
  if (currentContext) {
    return;
  }

  try {
    await startSiren();
  } catch (error) {
    console.error(error);
    statusLabel.textContent =
      "Audio could not start. Run the page from a local server and check the console.";

    if (currentContext) {
      await currentContext.close();
      currentContext = null;
    }

    currentPatch = null;
    playButton.disabled = false;
    stopButton.disabled = true;
  }
});

stopButton.addEventListener("click", async () => {
  try {
    await stopSiren();
  } catch (error) {
    console.error(error);
    statusLabel.textContent =
      "Shutdown was interrupted, but you can press play again.";
    currentPatch = null;
    currentContext = null;
    playButton.disabled = false;
    stopButton.disabled = true;
  }
});

wailButton.addEventListener("click", () => {
  setMode("wail");
});

yelpButton.addEventListener("click", () => {
  setMode("yelp");
});

async function startSiren() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    statusLabel.textContent =
      "This browser does not support the Web Audio API.";
    return;
  }

  currentContext = new AudioContextClass();

  if (currentContext.state === "suspended") {
    await currentContext.resume();
  }

  const cycleBuffer = createLogWaveCycleBuffer(currentContext);
  currentPatch = buildPoliceSiren(currentContext, cycleBuffer);
  currentPatch.start();
  currentPatch.setMode(currentMode);

  playButton.disabled = true;
  stopButton.disabled = false;
  statusLabel.textContent =
    currentMode === "wail"
      ? "Playing wail mode. Switch to yelp for the faster emergency sweep."
      : "Playing yelp mode. Switch to wail for the slower sweep.";
}

async function stopSiren() {
  if (!currentContext) {
    return;
  }

  if (currentPatch) {
    await currentPatch.stop();
  }

  currentPatch = null;
  await currentContext.close();
  currentContext = null;

  playButton.disabled = false;
  stopButton.disabled = true;
  statusLabel.textContent = "Stopped. Press play to start the siren again.";
}

function setMode(mode) {
  currentMode = mode;
  syncModeButtons();

  if (currentPatch) {
    currentPatch.setMode(mode);
    statusLabel.textContent =
      mode === "wail"
        ? "Playing wail mode. Slow logarithmic sweep at 0.1 Hz."
        : "Playing yelp mode. Fast logarithmic sweep at 3 Hz.";
  } else {
    statusLabel.textContent =
      mode === "wail"
        ? "Wail selected. Slow 0.1 Hz sweep is armed."
        : "Yelp selected. Fast 3 Hz sweep is armed.";
  }
}

function syncModeButtons() {
  wailButton.classList.toggle("is-active", currentMode === "wail");
  yelpButton.classList.toggle("is-active", currentMode === "yelp");
}

function createLogWaveCycleBuffer(context) {
  const length = context.sampleRate;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const channel = buffer.getChannelData(0);
  const normalizer = Math.E - 1;

  for (let index = 0; index < length; index += 1) {
    const phase = index / length;
    const halfPhase = phase < 0.5 ? phase * 2 : (phase - 0.5) * 2;
    const charge = 1 - (Math.exp(1 - halfPhase) - 1) / normalizer;

    channel[index] =
      phase < 0.5 ? -1 + 2 * charge : 1 - 2 * charge;
  }

  return buffer;
}

function buildPoliceSiren(context, cycleBuffer) {
  const lfo = createLoopingCycleSource(context, cycleBuffer);
  const carrier = createLoopingCycleSource(context, cycleBuffer);

  const carrierBase = context.createConstantSource();
  carrierBase.offset.value = SIREN_CONFIG.carrierBaseHz;

  const carrierDepth = context.createGain();
  carrierDepth.gain.value = SIREN_CONFIG.carrierDepthHz;

  const hornDrive = context.createGain();
  hornDrive.gain.value = SIREN_CONFIG.hornDrive;

  const clipper = context.createWaveShaper();
  clipper.curve = createClipCurve(SIREN_CONFIG.clipThreshold);
  clipper.oversample = "4x";

  const hornFilter = context.createBiquadFilter();
  hornFilter.type = "bandpass";
  hornFilter.frequency.value = SIREN_CONFIG.hornCenterHz;
  hornFilter.Q.value = SIREN_CONFIG.hornQ;

  const hornLevel = context.createGain();
  hornLevel.gain.value = 0.24;

  const finalMix = context.createGain();
  finalMix.gain.value = SIREN_CONFIG.outputLevel;

  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -20;
  limiter.knee.value = 10;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.18;

  const outputGate = context.createGain();
  outputGate.gain.value = 0;

  carrier.playbackRate.value = 0;
  lfo.playbackRate.value = SWEEP_RATES[currentMode];

  lfo.connect(carrierDepth);
  carrierDepth.connect(carrier.playbackRate);
  carrierBase.connect(carrier.playbackRate);

  carrier.connect(hornDrive);
  hornDrive.connect(clipper);
  clipper.connect(hornFilter);
  hornFilter.connect(hornLevel);

  const echoNodes = createEnvironmentEcho(context, hornLevel, finalMix);

  finalMix.connect(limiter);
  limiter.connect(outputGate);
  outputGate.connect(context.destination);

  return {
    start() {
      const now = context.currentTime;

      outputGate.gain.cancelScheduledValues(now);
      outputGate.gain.setValueAtTime(0, now);
      outputGate.gain.linearRampToValueAtTime(1, now + 0.08);

      carrierBase.start(now);
      lfo.start(now);
      carrier.start(now);
    },
    setMode(mode) {
      lfo.playbackRate.setTargetAtTime(
        SWEEP_RATES[mode],
        context.currentTime,
        0.05
      );
    },
    stop() {
      const now = context.currentTime;
      const stopTime = now + 0.2;

      outputGate.gain.cancelScheduledValues(now);
      outputGate.gain.setTargetAtTime(0, now, 0.03);

      carrier.stop(stopTime);
      lfo.stop(stopTime);
      carrierBase.stop(stopTime);

      return new Promise((resolve) => {
        window.setTimeout(() => {
          disconnectNodes([
            lfo,
            carrier,
            carrierBase,
            carrierDepth,
            hornDrive,
            clipper,
            hornFilter,
            hornLevel,
            finalMix,
            limiter,
            outputGate,
            ...echoNodes,
          ]);
          resolve();
        }, 280);
      });
    },
  };
}

function createEnvironmentEcho(context, input, destination) {
  const directGain = context.createGain();
  directGain.gain.value = SIREN_CONFIG.directLevel;

  const wetGain = context.createGain();
  wetGain.gain.value = SIREN_CONFIG.wetLevel;

  const feedbackBus = context.createGain();
  feedbackBus.gain.value = SIREN_CONFIG.feedbackLevel;

  const echoSum = context.createGain();
  echoSum.gain.value = 1;

  const nodes = [directGain, wetGain, feedbackBus, echoSum];
  const delays = [];

  input.connect(directGain);
  directGain.connect(destination);

  for (const delayTime of SIREN_CONFIG.delayTimes) {
    const delay = context.createDelay(1);
    delay.delayTime.value = delayTime;

    input.connect(delay);
    feedbackBus.connect(delay);
    delay.connect(wetGain);
    delay.connect(echoSum);

    delays.push(delay);
    nodes.push(delay);
  }

  echoSum.connect(feedbackBus);
  wetGain.connect(destination);

  return nodes;
}

function createLoopingCycleSource(context, buffer) {
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function createClipCurve(threshold) {
  const size = 2048;
  const curve = new Float32Array(size);

  for (let index = 0; index < size; index += 1) {
    const x = (index / (size - 1)) * 2 - 1;
    const clipped = Math.max(-threshold, Math.min(threshold, x));
    curve[index] = clipped / threshold;
  }

  return curve;
}

function disconnectNodes(nodes) {
  for (const node of nodes) {
    if (!node || typeof node.disconnect !== "function") {
      continue;
    }

    try {
      node.disconnect();
    } catch (error) {
      console.warn("Node disconnect failed", error);
    }
  }
}

syncModeButtons();
