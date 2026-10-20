export type VoiceAnalysis = {
  pitch: number;
  timing: number;
  stability: number;
  clarity: number;
  final: number;
  duration: number;
  silence: boolean;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function analyzeVoiceFromAudioBuffer(audioBuffer: AudioBuffer): VoiceAnalysis {
  const data = audioBuffer.getChannelData(0);

  if (!data.length) {
    return {
      pitch: 0,
      timing: 0,
      stability: 0,
      clarity: 0,
      final: 0,
      duration: Number(audioBuffer.duration.toFixed(1)),
      silence: true,
    };
  }

  let squaredSum = 0;
  let peak = 0;
  let silenceSamples = 0;
  let activeSamples = 0;

  for (let index = 0; index < data.length; index += 1) {
    const sample = Math.abs(data[index]);
    squaredSum += sample * sample;
    peak = Math.max(peak, sample);

    if (sample < 0.01) {
      silenceSamples += 1;
    } else {
      activeSamples += 1;
    }
  }

  const rms = Math.sqrt(squaredSum / Math.max(data.length, 1));
  const silenceRatio = silenceSamples / Math.max(data.length, 1);
  const energy = clamp(rms * 18, 0, 1.1);
  const vocalPresence = clamp((activeSamples / Math.max(data.length, 1)) * 2.4 + energy * 0.6, 0, 1);
  const isSilence = silenceRatio > 0.9 || vocalPresence < 0.12 || peak < 0.04;

  if (isSilence) {
    return {
      pitch: 0,
      timing: 0,
      stability: 0,
      clarity: 0,
      final: 0,
      duration: Number(audioBuffer.duration.toFixed(1)),
      silence: true,
    };
  }

  const pitch = clamp(0.35 + energy * 0.55 + peak * 0.5, 0, 1);
  const timing = clamp(0.3 + (1 - silenceRatio) * 0.55 + audioBuffer.duration / 120, 0, 1);
  const stability = clamp(0.45 + (1 - silenceRatio) * 0.75 - (1 - vocalPresence) * 0.25, 0, 1);
  const clarity = clamp(0.25 + peak * 1.8 + energy * 0.5, 0, 1);
  const finalScore = clamp((pitch * 0.35 + timing * 0.3 + stability * 0.2 + clarity * 0.15) * 10, 0, 10);

  return {
    pitch: Number((pitch * 10).toFixed(1)),
    timing: Number((timing * 10).toFixed(1)),
    stability: Number((stability * 10).toFixed(1)),
    clarity: Number((clarity * 10).toFixed(1)),
    final: Number(finalScore.toFixed(1)),
    duration: Number(audioBuffer.duration.toFixed(1)),
    silence: false,
  };
}

export function buildFinalScore(baseScore: number, voiceAnalysis: VoiceAnalysis | null) {
  if (!voiceAnalysis) {
    return Number(baseScore.toFixed(1));
  }

  return Number(((baseScore * 0.55 + voiceAnalysis.final * 0.45)).toFixed(1));
}
