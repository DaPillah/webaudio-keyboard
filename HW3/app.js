const playButton = document.getElementById("play-button");
const stopButton = document.getElementById("stop-button");
const statusLabel = document.getElementById("status");

const BROOK_PRESET = {
  inputLowpass: 228,
  modLowpass: 15,
  cutoffBase: 260,
  cutoffDepth: 1400,
  resonance: 38,
  outputLevel: 0.24,
};

let currentContext = null;
let currentBrook = null;

playButton.addEventListener("click", async () => {
  if (currentContext) {
    return;
  }

  try {
    await startBrook();
  } catch (error) {
    console.error(error);
    statusLabel.textContent =
      "Audio could not start. Run the page from a local server and check the console.";

    if (currentContext) {
      await currentContext.close();
      currentContext = null;
    }
  }
});

stopButton.addEventListener("click", async () => {
  try {
    await stopBrook();
  } catch (error) {
    console.error(error);
    statusLabel.textContent =
      "Shutdown was interrupted, but you can press play again.";
    currentBrook = null;
    currentContext = null;
    playButton.disabled = false;
    stopButton.disabled = true;
  }
});

async function startBrook() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    statusLabel.textContent =
      "This browser does not support the Web Audio API.";
    return;
  }

  currentContext = new AudioContextClass();
  await currentContext.audioWorklet.addModule("./brown-noise-processor.js");

  if (currentContext.state === "suspended") {
    await currentContext.resume();
  }

  const master = currentContext.createGain();
  master.gain.value = 0.75;

  const compressor = currentContext.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 10;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.01;
  compressor.release.value = 0.18;

  compressor.connect(master);
  master.connect(currentContext.destination);

  currentBrook = buildBrookPatch(currentContext, compressor);

  playButton.disabled = true;
  stopButton.disabled = false;
  statusLabel.textContent =
    "Playing. This version uses continuous brown-noise generators instead of a looping noise buffer.";
}

function buildBrookPatch(context, destination) {
  const sourceNoise = createBrownNoiseNode(context);
  const modNoise = createBrownNoiseNode(context);

  const sourceTone = context.createBiquadFilter();
  sourceTone.type = "lowpass";
  sourceTone.frequency.value = BROOK_PRESET.inputLowpass;
  sourceTone.Q.value = 0.707;

  const cutoffDrift = context.createBiquadFilter();
  cutoffDrift.type = "lowpass";
  cutoffDrift.frequency.value = BROOK_PRESET.modLowpass;
  cutoffDrift.Q.value = 0.707;

  const cutoffDepth = context.createGain();
  cutoffDepth.gain.value = BROOK_PRESET.cutoffDepth;

  const cutoffBase = context.createConstantSource();
  cutoffBase.offset.value = BROOK_PRESET.cutoffBase;

  const waterBand = context.createBiquadFilter();
  waterBand.type = "highpass";
  waterBand.frequency.value = BROOK_PRESET.cutoffBase;
  waterBand.Q.value = BROOK_PRESET.resonance;

  const output = context.createGain();
  output.gain.value = BROOK_PRESET.outputLevel;

  sourceNoise.connect(sourceTone);
  sourceTone.connect(waterBand);
  waterBand.connect(output);
  output.connect(destination);

  modNoise.connect(cutoffDrift);
  cutoffDrift.connect(cutoffDepth);
  cutoffDepth.connect(waterBand.frequency);
  cutoffBase.connect(waterBand.frequency);

  cutoffBase.start();

  return {
    stop() {
      cutoffBase.stop();

      sourceNoise.disconnect();
      modNoise.disconnect();
      sourceTone.disconnect();
      cutoffDrift.disconnect();
      cutoffDepth.disconnect();
      cutoffBase.disconnect();
      waterBand.disconnect();
      output.disconnect();
    },
  };
}

function createBrownNoiseNode(context) {
  return new AudioWorkletNode(context, "brown-noise-processor", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });
}

async function stopBrook() {
  if (!currentContext) {
    return;
  }

  if (currentBrook) {
    currentBrook.stop();
  }

  currentBrook = null;
  await currentContext.close();
  currentContext = null;

  playButton.disabled = false;
  stopButton.disabled = true;
  statusLabel.textContent = "Stopped. Press play to start the brook again.";
}
