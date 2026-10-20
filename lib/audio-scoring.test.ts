import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeVoiceFromAudioBuffer } from "./audio-scoring.ts";

describe("audio scoring", () => {
  it("returns zeroed metrics when there is silence or no vocal presence", () => {
    const length = 48000;
    const buffer = {
      duration: length / 48000,
      getChannelData: () => new Float32Array(length),
    } as unknown as AudioBuffer;

    const result = analyzeVoiceFromAudioBuffer(buffer);

    assert.equal(result.silence, true);
    assert.equal(result.pitch, 0);
    assert.equal(result.timing, 0);
    assert.equal(result.stability, 0);
    assert.equal(result.clarity, 0);
    assert.equal(result.final, 0);
  });
});
