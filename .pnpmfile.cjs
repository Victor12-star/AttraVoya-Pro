module.exports = {
  hooks: {
    readPackage(pkg) {
      if (
        pkg.name !== 'attravoya-pro' &&
        pkg.dependencies &&
        Object.prototype.hasOwnProperty.call(pkg.dependencies, 'node-forge')
      ) {
        delete pkg.dependencies['node-forge'];
      }

      return pkg;
    },
  },
};
