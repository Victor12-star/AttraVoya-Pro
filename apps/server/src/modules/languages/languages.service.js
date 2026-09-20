import { MAX_PUBLIC_LANGUAGE_RECORDS } from './languages.contracts.js';

export function createLanguagesService(repository) {
  return {
    async listLanguages() {
      const languages = await repository.list();

      return Array.isArray(languages) ? languages.slice(0, MAX_PUBLIC_LANGUAGE_RECORDS) : [];
    },
  };
}
