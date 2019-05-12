// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

module.exports = function (options = {}) {
  return async context => {
	  
	const gridFS = await context.app.get("gridFS");
	 
	var downloadStream = gridFS.openDownloadStream(context.id);
	
	const chunks = [];
	
	context.result.data = await new Promise((resolve, reject) => {
		downloadStream.on('data', chunk => chunks.push(chunk))
		downloadStream.on('error', reject)
		downloadStream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
	})
	
    return context;
  };
};
