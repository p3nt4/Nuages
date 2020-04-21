// Use this hook to manipulate incoming or outgoing data.
// For more information on hooks see: http://docs.feathersjs.com/api/hooks.html

// eslint-disable-next-line no-unused-vars

var path = require('path');

var fs = require('fs');

function recFindByExt(base,ext,files,result) 
{
    files = files || fs.readdirSync(base) 
    result = result || [] 

    files.forEach( 
        function (file) {
            var newbase = path.join(base,file)
            if ( fs.statSync(newbase).isDirectory() )
            {
                result = recFindByExt(newbase,ext,fs.readdirSync(newbase),result)
            }
            else
            {
                if ( file.substr(-1*(ext.length+1)) == '.' + ext )
                {
                    result.push(newbase)
                } 
            }
        }
    )
    return result
}


module.exports = function (options = {}) {
  return async context => {

    if(context.data.handlerPath == "all"){
      var handlers = recFindByExt(path.join(__dirname,'..','..','handlers'),'js');
      handlers.forEach(async function(path){

        delete require.cache[path]

        var handlerFile = require(path);

        var handler = handlerFile.load(context.app);

        var query = await context.app.service("handlers").find({query:{name: handler.name}});

        if (query.total == 0){
          context.app.service("handlers").create(handler);
        }
      });

    } else{
      delete require.cache[require.resolve("../../handlers/"+context.data.handlerPath.replace("..",""))]

      var handlerFile = require("../../handlers/"+context.data.handlerPath.replace("..",""));

      var handler = handlerFile.load(context.app);

      var query = await context.app.service("handlers").find({query:{name: handler.name}});

      if (query.total > 0){
        throw new error.Forbidden("A handler with this name already exists");
      }
      context.result = await context.app.service("handlers").create(handler);
    }

    return context;
  };
};
