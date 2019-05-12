// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

// This should be a find, but I think it is cleaner as a post request.
const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {
		
		// Ensure the implant knows the file id
	  if(!context.data.file_id || context.data.file_id.length != 32 || context.data.n == undefined){
		  
		  throw new error.Forbidden("Unauthorized");
		  
		}
		// Actually fetch the chunk
		const result = await context.app.service("/fs/chunks").find({query:{n: parseInt(context.data.n), files_id: context.data.file_id}});
		
		context.result = result.data[0];

		return context;
  };
  
};
