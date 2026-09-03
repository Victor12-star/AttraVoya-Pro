/**
 * System-first font stacks keep development builds fast and private while still
 * feeling native on Windows, macOS, iOS, and Android. A licensed brand font can
 * be introduced later without changing component-level typography decisions.
 */
export const typography = Object.freeze({
  fontFamily: {
    ui: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.05,
    heading: 1.15,
    body: 1.6,
  },
});

export default typography;
