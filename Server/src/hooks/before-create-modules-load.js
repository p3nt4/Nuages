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

    if(context.data.modulePath == "all"){
      var modules = recFindByExt(path.join(__dirname,'..','..','modules'),'js');
      modules.forEach(async function(path){
        
        delete require.cache[path]

        var moduleFile = require(path);

        var module = moduleFile.load(context.app);

        var query = await context.app.service("modules").find({query:{name: module.name}});

        if (query.total == 0){
          context.app.service("modules").create(module);
        }
      });

    } else{
      delete require.cache[require.resolve("../../modules/"+context.data.modulePath.replace("..",""))]

      var moduleFile = require("../../modules/"+context.data.modulePath.replace("..",""));

      var module = moduleFile.load(context.app);

      var query = await context.app.service("modules").find({query:{name: module.name}});

      if (query.total > 0){
        throw new error.Forbidden("A module with this name already exists");
      }
      context.result = await context.app.service("modules").create(module);
    }

    return context;
  };
};
