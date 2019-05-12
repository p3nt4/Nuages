// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const srs = require('secure-random-string');

const Readable = require('stream').Readable;

module.exports = function (options = {}) {
  return async context => {
    const { data } = context;

    var data2 = {};


		//Data validation
    data2._id = srs({length: 32, alphanumeric: true});
	
		context.data._id = data2._id;
		
		if(data.filename === undefined){

			throw new error.BadRequest("Filename is required");
			
		}else{
	
			data2.filename = data.filename.substring(0,100);
		
		}
		
		data2.chunkSize = parseInt(data.chunkSize) ? parseInt(data.chunkSize) : "2400000";

		data2.uploadDate = Date.now();
		
		if(data2.chunkSize % 4 != 0){
	
			throw new error.BadRequest("Chunksize must be a multiplier of 4");
		
		}
		
		// Use the gridFS object to upload the file
		const gridFS = await context.app.get("gridFS");

    const s = new Readable();
	
		s._read = () => {};

		const uploadStream = gridFS.openUploadStreamWithId(data2._id,context.data.filename,{metadata: {size: data2.size},chunkSizeBytes: data2.chunkSize });

		uploadStream.once('finish', function(a) {
			context.data = a;
		});
	
    s.pipe(uploadStream).
		on('error', function(error) {
			throw new error.GeneralError(error.message);
		}).
		on('finish', function(a) {
		});
		
		s.push(context.data.content);

		s.push(null);

		return context;
  };
};
