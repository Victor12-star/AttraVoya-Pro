export function createTranslationService(provider) {
  return {
    translate(body) {
      return provider.translate({ text: body.text, source: body.source, target: body.target, format: 'text' });
    },
    getLanguages() {
      return provider.getLanguages();
    },
  };
}
