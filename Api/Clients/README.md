## The client API

Nuages is based on FeatherJS, so referring to the FeatherJS documentation is a good way to get started: https://docs.feathersjs.com/api/client.

The Webterm client can also be used as an example.


### Objects
The following RESTful objects can be accessed using the API:

| Object  | Url | Description | Restrictions
| ------------- | ------------- |-----------|---|
| Implants  | /implants | The implants managed by the Nuages instance | N/A
| Jobs  | /jobs | The jobs assigned to implants | Jobs can be created but cannot be modified by the user
| Files  | /fs/files | The GridFS files stored on the Nuages server | Files can be created but cannot be modified by the user, they must be removed through the /fs service
| Chunks  | /fs/chunks | The GridFS chunks stored on the Nuages server | Chunks can be created but cannot be modified by the user
| Modules  | /modules | The modules loaded by the server | Modules can be created but cannot be modified by the user
| Module runs  | /modules/runs | Used to track a module run | Modules runs can be created but cannot be modified by the user
| Users  | /users | The Nuages users | Multi user support will be added in the future, additional users cannot be created yet

### Additional Endpoints
The following additional endpoint can be used:

| Url | Method | Description
| ------------- |-----------|---|
| /fs | DELETE | Used to delete a file using the GridFS wrapper, it will delete every chunk related to the file
| /fs | PATCH | Used to update a file object once all the chunks have been uploaded
| /modules/load | POST | Used to load a module into the database

### Object examples

#### Implants

```
{
  "_id": "9IEF644Nka5oT1oeAEE085yMKGut8y2y", // The id of the implant
  "createdAt":1556122589365, // The creation time of the implant
  "lastSeen":1556122589365, // The last heartbeat of the implant
  "hostname": "John-PC", // The hostname of the implant
  "username": "John", // The Username of the implant
  "localIp": "192.168.0.3", // The local IP of the implant
  "sourceIp": "", // The remote IP of the implant, this would need to be filled by the handler
  "os": "windows", // The OS of the implant
  "handler": "Direct", // The type of handler
  "connectionString": "http://127.0.0.1:3333", // The connection used by the implant
  "options": {}, // Additional optional fields
  "supportedPayloads": [ //The payloads supported by the implant
    "Command",
    "Exit",
    "Download",
    "Upload",
    "Configure"
  ]
}
```

#### Jobs

```
{
    "_id":"xqq5oU0lMOOTKAaMhro14FolxptVpAhY", // The Job ID
    "implantId":"9IEF644Nka5oT1oeAEE085yMKGut8y2y", // The Implant ID
    "timeout":1556122717740, // The timeout (implemented server side)
    "payload": //The payload of the job, refer the implants API documentation for common payloads
    {
      "type":"Command",
      "options":{"path":".","cmd":"hostname"}
      },
    "createdAt":1556122657741, // The job creation date
    "lastUpdated":1556122657741, // The last time the job was updated
    "jobStatus":0, // The job status (0:Submitted, 1: Received, 2: Awaiting more data from the implant, 3: Succeeded, 4: Failed)
    "result":"" // The job result 
}
```

#### Files
Refer to the GridFS documentation for additional information
```
{
  "_id" : "RqNIUE93b9X6QynUezjpIwETArSDTyLW", // The file ID
  "metadata" : 
  { 
    "path": "N/A", // The file path, for files uploaded by implants
    "uploadedBy" : "user" The implant/user who uploaded the file
  }, 
  "length" : 20, // The file (encoded in base64) size in bytes
  "filename" : "calc.bat", // The file name
  "chunkSize" : 2400000, // The chunk size
  "uploadDate" : 1556136458023 // The upload date
}
```

#### Chunks
Refer to the GridFS documentation for additional information

```
{ 
  "_id" : "5cc0c20a029fee19ef7724e3", // The file ID
  "files_id" : "RqNIUE93b9X6QynUezjpIwETArSDTyLW", // The file the chunk is part of
  "n" : 0,  // The chunk number
  "data" : "VTNSaGNuUWdZMkZzWXk1bGVHVT0=" // The chunk data
}
```

#### Modules
```
{
  "_id": "5cc0bee3a2902a19bc6c69c6", // The module ID
  "name": "windows/admin/download_and_run",  // The module name
  "options": {  // The module options
    "file": {  // The name of the option
      "value": "", // The default value of the option
      "required": true, // Is this option required
      "description": "The ID of the file to download" // The description of the option
    }, 
    "path": { "value": "C:\\Temp", "required": true, "description": "The path to download the file to" }, 
    "arguments": { "value": "", "required": false, "description": "The arguments to execute the program with" }, 
    "implant": { "value": "", "required": true, "description": "The ID of the implant" } }, 
  "supportedOS": [ "windows" ], // An array of supported OS
  "description": "Downloads and runs a file on the target implant", // The module description
  "requiredPayloads": [ "Command", "Download" ] // The list of payloads the implant must support
}
```

#### Module Runs
```
{  
   "_id":"06jJkWYJCrGIelFI3x1OYM8G3w0BGtRi", // The run ID
   "createdAt":1556134947236, // The creation time
   "lastUpdated":1556134947282, // The last update time
   "log":[  // An array containing log entries, to communicated with the client
      {  
         "type":1, // The entry type (0: Info, 1: Error, 2: Success)
         "message":"Cannot read property 'value' of undefined", // The entry message
         "time":1556134947281 // The entry time
      }
   ],
   "moduleName":"windows/admin/download_and_run", // The module being run
   "creator":"user", // The creator of the run
   "options":{  // The options of the run
      "file":{  
         "value":"wwsb0xXmIvnlwOAqYwKY68yhAhb9iTle",
         "required":true,
         "description":"The ID of the file to download"
      },
      "path":{  
         "value":"C:\\Temp",
         "required":true,
         "description":"The path to download the file to"
      },
      "arguments":{  
         "value":"",
         "required":false,
         "description":"The arguments to execute the program with"
      },
      "implant":{  
         "value":"wwsb0xXmIvnlwOAqYwKY68yhAhb9iTle",
         "required":true,
         "description":"The ID of the implant"
      }
   },
   "moduleId":"5cc0a8a83c3c3418bc73e5b2", // The ID of the module
   "runStatus":4 //The status of the run (0:Submitted, 1: In progress, 3: Succeeded, 4: Failed)
}
```

### Additional endpoint examples

#### DELETE /fs

```
{
  "_id": "9IEF644Nka5oT1oeAEE085yMKGut8y2y", // The id of the file
}
```

#### PATCH /fs

```
{
  "id": "9IEF644Nka5oT1oeAEE085yMKGut8y2y", // The id of the file
  data: {} // Data is not actually needed
}
```

#### POST /modules/load

```
{
  "modulePath": "windows/admin/download_and_run" // The path of the module to load
}
```
