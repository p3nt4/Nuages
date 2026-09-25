// Simple post-read normalization for fs records.
module.exports = (options = {}) => {
  return async context => {
    if (context.result && context.result._id && !context.result.mongoId) {
      context.result.mongoId = context.result._id;
    }

    return context;
  };
};
