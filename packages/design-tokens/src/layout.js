/**
 * Content-first window classes shared by native and web layout code.
 * Consumers must classify the available window, not the physical device,
 * so split-screen and foldable layouts remain usable.
 */
export const windowBreakpoints = Object.freeze({
  medium: 600,
  expanded: 840,
  large: 1200,
});

export const contentWidths = Object.freeze({
  reading: 720,
  form: 640,
  standard: 1120,
  wide: 1440,
});

export const pageGutters = Object.freeze({
  compact: 16,
  medium: 24,
  expanded: 32,
});

export function getWindowSizeClass(width) {
  if (!Number.isFinite(width) || width < 0) {
    return 'compact';
  }

  if (width >= windowBreakpoints.large) {
    return 'large';
  }

  if (width >= windowBreakpoints.expanded) {
    return 'expanded';
  }

  if (width >= windowBreakpoints.medium) {
    return 'medium';
  }

  return 'compact';
}

export function getPageGutter(width) {
  const sizeClass = getWindowSizeClass(width);

  if (sizeClass === 'large' || sizeClass === 'expanded') {
    return pageGutters.expanded;
  }

  if (sizeClass === 'medium') {
    return pageGutters.medium;
  }

  return pageGutters.compact;
}
