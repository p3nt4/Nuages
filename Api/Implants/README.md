## Implant API

| Endpoint  | Method | Description
| ------------- | ------------- |-----------|
| /implant/register  | POST | Register the implant and obtain an implant ID |
| /implant/heartbeat | POST  | Signal that the implant is still alive and obtain jobs|
| /implant/jobresult | POST  | Submit the results of a completed job |
| /implant/chunks | POST  | Obtain a file chunk for file downloads |

### /implant/register

Request:
```
{
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

Response:
```
{
  "_id":"9IEF644Nka5oT1oeAEE085yMKGut8y2y", //The ID of the implant
  "createdAt":1556122589365,
  "lastSeen":1556122589365,
  "hostname": "John-PC",
  "username": "John",
  "localIp": "192.168.0.3",
  "sourceIp": "",
  "os": "windows", 
  "handler": "Direct",
  "connectionString": "http://127.0.0.1:3333",
  "options": {},
  "supportedPayloads": [
    "Command",
    "Exit",
    "Download",
    "Upload",
    "Configure"
  ]
}
```

### /implant/heartbeat

Request:
```
{
  "id": "9IEF644Nka5oT1oeAEE085yMKGut8y2y" // The ID of the implant
}

```

Response:
```
{
  "data":[ //The list of jobs
    {
      "_id":"xqq5oU0lMOOTKAaMhro14FolxptVpAhY", // The Job ID
      "implantId":"9IEF644Nka5oT1oeAEE085yMKGut8y2y", // The Implant ID
      "timeout":1556122717740, // The timeout (implemented server side)
      "payload": //The payload of the job 
      {
        "type":"Command",
        "options":{"path":".","cmd":"hostname"}
        },
      "createdAt":1556122657741, // The job creation date
      "lastUpdated":1556122657741, 
      "jobStatus":0, // The job status (always 0 at this stage)
      "result":"" // The job result (always "" at this stage)
    }
  ]
}
```

### /implant/jobresult

Request:
```
{
  "n": 0, // If the result needs to be chunked, the number of the current chunk
  "moreData": false, // If this is the last chunk
  "error": false, // If the job execution encountered an error
  "result": "", // The text result of the job, can be chunked if needed
  "jobId": "xqq5oU0lMOOTKAaMhro14FolxptVpAhY", // The Job ID
  "data": "" // For upload jobs, the current file chunk in base64
}
```

Response:
```
{}
```

### /implant/chunks

Request:
```
{
  "n": 0, // The number of the current chunk
  "file_id": "cm7G6mSSP6CK8yCNtRxXB7H4QHoG3S7Q" // The file ID
}
```

Response:
```
{
  "_id":"5cc08c37e921cc18c011d6f2", // The chunk ID (not used)
  "files_id":"cm7G6mSSP6CK8yCNtRxXB7H4QHoG3S7Q", // The chunk ID (not used)
  "n":0, //The number of the current chunk
  "data":"BASE64" //The chunk data in base64 form
}
```
## Job payloads
Job payloads are in the format {Type: "", Options: {}} and can be implemented in anyway desired, although using standardized payloads will enable more compatibility for modules and clients down the road.

The following job payloads are currently defined

### Command

Payload:
```
{
  "type":"Command", 
  "options":{
    "path":".", // The path to execute the command in (Optional)
    "cmd":"hostname" // The command
  }
}
```

Jobresult:
```
{
  "n": 0,
  "moreData": false,
  "error": false,
  "result": "John-PC\r\n", // The stdout and stderr of the command
  "jobId": "hYSVr8AR240BQ86OcWQ8jGkgi2Ix2oBU",
  "data": ""
}
```

### Exit

Payload:
```
{
  "type":"Exit", 
  "options":{}
}
```

Jobresult:
```
{
  "n": 0,
  "moreData": false,
  "error": false,
  "result": "Bye Bye!", // A polite good bye message
  "jobId": "hYSVr8AR240BQ86OcWQ8jGkgi2Ix2oBU",
  "data": ""
}
```
### Configure

Payload:
```
{
  "type":"Configure",
  "options":{
    "config":{"sleep":"5"} // An object containing the configuration items to modify
  }
}
```

Jobresult:
```
{
  "n": 0,
  "moreData": false,
  "error": false,
  "result": "{\"sleep\":\"5\",\"maxrequestsize\":\"50000\",\"id\":\"O4jRCnANBHj4StyFIbt7SYon3d797cDC\"}", // The new configuration of the implant (as a string)
  "jobId": "IbaWXsw94KukCs9gmfjTq1Jj09SXQRdW",
  "data": ""
}
```
### Download

Payload:
```
{
  "type":"Download",
  "options":{
    "file":"calc.bat", // The absolute or relative path where to download the file
    "file_id":"MYV7fuK6o4seL45Zb0IKlzKgD9WBbhSv", // The file ID
    "length":20, // The size of the file (encoded as base64) in bytes
    "chunkSize":2400000, // The size of the chunks
    "path":"C:\\Temp" // The path where to execute the Download (if the file option is a relative path)
  }
}
```

Jobresult:
```
{
  "n": 0,
  "moreData": false,
  "error": false,
  "result": "C:\\Temp\\calc.bat", // The path where the file was downloaded
  "jobId": "MYV7fuK6o4seL45Zb0IKlzKgD9WBbhSv",
  "data": ""
}
```

### Upload

Payload:
```
{
  "type":"Upload",
  "options":{
    "file":"calc.bat", // The absolute or relative path of the file to upload
    "chunkSize":2400000, // The size of the chunks
    "path":"C:\\Temp" // The path where to execute the Download (if the file option is a relative path)
  }
}
```

Jobresult:
```
{
  "n": 0,
  "moreData": false,
  "error": false,
  "result": "C:\\Temp\\calc.bat", // The path of the uploaded file
  "jobId": "9EPJ5IJhvLZBi3pWeyfjtvlHE40YIyeB",
  "data": "U3RhcnQgY2FsYy5leGU=" // The base64 content of the current chunk
}
```
