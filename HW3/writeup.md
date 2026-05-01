# Lab 3 Writeup - Police Siren

## Sound Goal

For Part II, I recreated a police siren in Web Audio using the method described in Farnell. The target was the familiar emergency rise-and-fall sound with two operating modes: a slower wail and a faster yelp. I wanted the result to sound synthetic in a controlled way, with a strong horn color and a small amount of city-like echo rather than sounding like a clean test oscillator.

## Main Idea

The design is built from three main stages:

1. A logarithmic oscillator shape based on capacitor charge and discharge.
2. A horn stage that adds nonlinear distortion and a resonant band-pass filter around 1.5 kHz.
3. A short recirculating delay network that acts like reflections from nearby buildings.

The low-frequency oscillator sweeps the audible oscillator across an 800 Hz range above 300 Hz. I implemented the two sweep-rate modes from the text: 0.1 Hz for wail and 3 Hz for yelp.

## Signal Flow

The signal flow graph is shown in `assets/police-siren-signal-flow.svg`.

## Synthesis Types And Why They Fit Together

This patch combines waveform design, distortion, subtractive filtering, and delay-based ambience. The custom oscillator provides the characteristic time shape of the sweep. The clipping stage simulates the overdriven diaphragm, which adds strong harmonics. The resonant band-pass filter then shapes those harmonics into a brighter horn-like tone. Finally, the delay network places the sound into an environment, which helps it read as a siren in a city instead of just an abstract electronic tone.

## Process And Experience

The most important lesson from this patch was that the oscillator alone does not sound very convincing. The horn stage matters a lot because it turns a relatively simple sweep into something sharper and more aggressive. The echo network also had a big effect: even a small amount of recirculating delay made the sound feel much more believable and much less dry. I kept the structure modular so that I could separately tune the sweep, the horn, and the environment.

## What I Would Improve Next

If I had more time, I would build a more detailed horn model using several parallel resonant filters instead of a single band-pass stage. I would also experiment with a stereo version of the echo section and compare the logarithmic oscillator directly against the triangle-wave shortcut mentioned later in the chapter.
