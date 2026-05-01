class BrownNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.lastOut = 0;
  }

  process(inputs, outputs) {
    const output = outputs[0];

    for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
      const channel = output[channelIndex];

      for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += 1) {
        const white = Math.random() * 2 - 1;
        const brown = (this.lastOut + 0.02 * white) / 1.02;
        this.lastOut = brown;
        channel[sampleIndex] = brown * 3.5;
      }
    }

    return true;
  }
}

registerProcessor("brown-noise-processor", BrownNoiseProcessor);
