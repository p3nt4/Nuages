// Prevent generation-time issues during fs removal by normalizing the context.
module.exports = (options = {}) => {
  return async context => {
    if (!context.params) {
      context.params = {};
    }

    return context;
  };
};
