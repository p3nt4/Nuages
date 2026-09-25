// Normalize the fs chunks list after a find operation.
// The original code expects the hook to be present for service integration and tests.
module.exports = (options = {}) => {
  return async context => {
    if (context.result && Array.isArray(context.result.data)) {
      context.result.data = context.result.data.map((item) => ({
        ...item,
        mongoId: item._id,
      }));
    }

    return context;
  };
};
