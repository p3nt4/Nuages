// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const srs = require('secure-random-string');

const error = require('@feathersjs/errors');

module.exports = (options = {}) => {
  return async context => {

    var data = {};

    data._id = srs({length: context.app.get('id_length'), alphanumeric: true});

    data.url = context.data.url; // The webhook url

    data.type = context.data.type; // The webhook type

    data.ignoreCertErrors = (context.data.ignoreCertErrors == true); // Do not validate certificate

    context.data = data;

    if (data.type != "mattermost"){
      throw new error.BadRequest("Web Hook type not supported");
    }

    return context;
  };
};
