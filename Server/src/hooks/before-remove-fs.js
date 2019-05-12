// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
module.exports = function (options = {}) {
  return async context => {
	  
    const gridFS = await context.app.get("gridFS");
    
    // Use the gridFS wrapper for convenience
    gridFS.delete(context.id);
    
    return context;
  };
};
