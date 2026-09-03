export function createLanguagesService(repository) {
  return {
    async listLanguages() {
      return repository.list();
    },
  };
}
