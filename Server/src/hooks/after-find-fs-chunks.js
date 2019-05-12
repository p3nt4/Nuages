// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

//const Binary = require('mongodb').Binary;

module.exports = function (options = {}) {
  return async context => {
	for(var i = 0; i < context.result.data.length; i++){
		context.result.data[i].data = context.result.data[i].data.value();
	}
    return context;
  };
};
