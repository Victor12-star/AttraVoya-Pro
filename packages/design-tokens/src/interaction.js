/**
 * Cross-platform interaction constraints. Forty-eight pixels/dp keeps touch
 * controls comfortably above the WCAG 2.2 minimum while matching Android
 * accessibility guidance. Visual icons may be smaller inside this hit area.
 */
export const interaction = Object.freeze({
  minimumTargetSize: 48,
  minimumControlHeight: 48,
  comfortableControlHeight: 56,
  focusRingWidth: 3,
  disabledOpacity: 0.48,
  pressedOpacity: 0.84,
});

export const feedbackTiming = Object.freeze({
  immediate: 100,
  progressIndicator: 400,
  slowActionMessage: 10_000,
});
