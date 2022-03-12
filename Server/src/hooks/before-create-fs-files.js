const srs = require('secure-random-string');

const error = require('@feathersjs/errors');

module.exports = function (options = {}) {
  return async context => {
	  
	const { data } = context;

  var data2 = {};

  // Data validation
  data2._id = srs({length: context.app.get('id_length'), alphanumeric: true});

  data2.metadata = data.metadata ? data.metadata : {};

  data2.length = 0;
	
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
	
    // Override the original data
    context.data = data2;
	
    return context;
  };
};