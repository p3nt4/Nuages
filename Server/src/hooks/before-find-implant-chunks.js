// Guard implant chunk queries before the service handles them.
module.exports = (options = {}) => {
  return async context => {
    if (!context.params) {
      context.params = {};
    }

    if (!context.params.query) {
      context.params.query = {};
    }

    return context;
  };
};
