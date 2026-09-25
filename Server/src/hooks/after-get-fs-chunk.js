// Keep chunk reads consistent with the rest of the fs hooks.
module.exports = (options = {}) => {
  return async context => {
    if (context.result && context.result._id && !context.result.mongoId) {
      context.result.mongoId = context.result._id;
    }

    return context;
  };
};
