// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

// This method updates a file object after the chunks have been uploaded
module.exports = function (options = {}) {
  return async context => {

    const file = await context.app.service('/fs/files').get(context.id);  

		if(file === undefined){
			throw error.NotFound("File not found");
		}
		
		// Find the last chunk of the file
		const query = await context.app.service('/fs/chunks').find({
		  query: {
			$limit: 1,
			files_id: context.id,
			$sort: {
			  n: -1
			}
		  }
		});
		
		const lastChunk = query.data[0];
		
		file.length = lastChunk.n * file.chunkSize + lastChunk.data.length;
		
		file.uploadDate = Date.now();

		if(context.data.path){
			file.metadata.path = context.data.path;
		}

		if(context.params.user !== undefined){
			file.metadata.uploadedBy = context.params.user.email;
		}
		else if(context.data.uploadedBy){
			file.metadata.uploadedBy = context.data.uploadedBy;
		}
		
		context.app.service('/fs/files').patch(context.id, file);
		
		context.data = file;
	  
    return context;
  };
};
