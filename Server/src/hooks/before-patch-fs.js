// Ensure fs patch requests are initialized before processing.
module.exports = (options = {}) => {
  return async context => {
    if (!context.data) {
      context.data = {};
    }

    if (!context.data.updatedAt) {
      context.data.updatedAt = Date.now();
    }

    return context;
  };
};
