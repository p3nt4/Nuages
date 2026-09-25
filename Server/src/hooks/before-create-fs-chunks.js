// Ensure fs chunk creation requests are always initialized safely.
module.exports = (options = {}) => {
  return async context => {
    if (!context.data) {
      context.data = {};
    }

    if (!context.data.createdAt) {
      context.data.createdAt = Date.now();
    }

    return context;
  };
};
