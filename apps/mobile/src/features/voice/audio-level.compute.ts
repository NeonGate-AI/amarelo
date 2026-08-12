const NOISE_FLOOR = 0.015
const CONVERSATIONAL_PEAK = 0.18

export function computeNormalizedAmplitude(buffer: ArrayBuffer) {
  const samples = new Float32Array(buffer)

  if (samples.length === 0) {
    return 0
  }

  let squaredTotal = 0

  for (const sample of samples) {
    squaredTotal += sample * sample
  }

  const rootMeanSquare = Math.sqrt(squaredTotal / samples.length)
  const normalized =
    (rootMeanSquare - NOISE_FLOOR) / (CONVERSATIONAL_PEAK - NOISE_FLOOR)

  return Math.min(1, Math.max(0, normalized))
}
