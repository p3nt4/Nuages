// Guard fs chunk find requests and normalize the query shape.
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
