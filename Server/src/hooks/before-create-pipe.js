// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars
const error = require('@feathersjs/errors');

const srs = require('secure-random-string');

var MemoryStream = require('memorystream');

module.exports = (options = {}) => {
  return async context => {

    var data = {};
    // These pipes are used to communicate between implants and clients directly
    if(context.data.type == "interactive" || context.data.type == "bidirectional"){
      data.id = srs({length: context.app.get('id_length'), alphanumeric: true});
      data._id = data.id;
      data.implantId = context.data.implantId;
      data.type = context.data.type ? context.data.type : "";
      data.destination = context.data.destination ? context.data.destination : "";
      data.source = context.data.source ? context.data.source : "";
      data.canRead = true;
      data.canWrite = true;
      // This is a max buffer size
      data.bufferSize = parseInt(context.data.bufferSize) ? parseInt(context.data.bufferSize) : 261120;

      context.app.pipe_list[data._id]={
        bufferSize : data.bufferSize,
        dataUp: 0,
        dataDown: 0,
        in: new MemoryStream(), // in is towards implants
        out: new MemoryStream(), // out is towards clients
        canRead: true,
        canWrite: true
      };
    }
    // This is a file upload
    else if(context.data.type == "upload"){
      data.id = srs({length: context.app.get('id_length'), alphanumeric: true});
      data._id = data.id;
      data.implantId = context.data.implantId;
      data.type = context.data.type ? context.data.type : "";
      data.source = context.data.source ? context.data.source : "";
      data.filename = context.data.filename;
      uploadedBy = context.params.user ? context.params.user.email : data.implantId;
      if(data.filename === undefined){
        throw error.BadRequest("A filename is required");
      }
      data.canRead = false;
      data.canWrite = true;
      // This is a max buffer size
      data.bufferSize = parseInt(context.data.bufferSize) ? parseInt(context.data.bufferSize) : 65536;
      // Let's open a GridFS stream
      file_id = srs({length: context.app.get('id_length'), alphanumeric: true});
      data.destination = file_id;
      stream = context.app.gridFS.openUploadStream(file_id,{metadata:{filename:data.filename,uploadedBy:uploadedBy}});
      stream.on('error', function(err) {
        console.log(err);
      });
      stream.on('finish', function() {
        if (stream.length == 0){
          context.app.service("/files").remove(file_id);
        }
      });
      if(data.implantId){
        context.app.pipe_list[data._id]={
          dataUp: 0,
          dataDown: 0,
          bufferSize : data.bufferSize,
          out: stream, 
          canRead: false,
          canWrite: true
        };
      }else{
        context.app.pipe_list[data._id]={
          dataUp: 0,
          dataDown: 0,
          bufferSize : data.bufferSize,
          in: stream,
          canRead: false,
          canWrite: true
        };
      }
    }

    // This is a file download
    else if(context.data.type == "download"){
      data.id = srs({length: context.app.get('id_length'), alphanumeric: true});
      data._id = data.id;
      data.implantId = context.data.implantId;
      data.type = context.data.type ? context.data.type : "";
      data.destination = context.data.destination ? context.data.destination : "";
      data.source = context.data.source;
      if(data.source === undefined){
        throw error.BadRequest("A source is required");
      }
      data.canRead = true;
      data.canWrite = false;
      // This is a max buffer size
      data.bufferSize = parseInt(context.data.bufferSize) ? parseInt(context.data.bufferSize) : 65536;
      // Let's open a GridFS stream
      stream = context.app.gridFS.openDownloadStreamByName(data.source);
      stream.on('error', function(err) {
        console.log(err);
      });
      
      //I dont know why this is needed...
      //Time to buffer the stream into memory?
      stream.read();

      if(data.implantId){
        context.app.pipe_list[data._id]={
          bufferSize : data.bufferSize,
          dataUp: 0,
          dataDown: 0,
          in: stream, 
          canRead: true,
          canWrite: false
        };
      }else{
        context.app.pipe_list[data._id]={
          bufferSize : data.bufferSize,
          dataUp: 0,
          dataDown: 0,
          out: stream,
          canRead: true,
          canWrite: false
        };
      }
    }
    
    // If the id is already defined this pipe has already been created by a tunnel object and only needs to be saved
    else if(context.data._id){
      // Using the both _id and id for consistency (id is used by feathers memory instead of _id)
      data.id = context.data._id;
      data._id = context.data._id;
      data.tunnelId = context.data.tunnelId;
      data.implantId = context.data.implantId;
      data.destination = context.data.destination;
      data.type = context.data.type;
      data.source = context.data.source;
      data.bufferSize = parseInt(context.data.bufferSize) ? parseInt(context.data.bufferSize) : 65536;
    }

    context.data = data;

    return context;
  };
};
