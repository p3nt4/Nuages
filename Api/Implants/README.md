## Implant API

| Endpoint  | Method | Description
| ------------- | ------------- |-----------|
| /implant/register  | POST | Register the implant and obtain an implant ID |
| /implant/heartbeat | POST  | Signal that the implant is still alive and obtain jobs|
| /implant/jobresult | POST  | Submit the results of a completed job |
| /implant/io | POST  | Communicate with channels/pipes |

### /implant/register

Request:
```javascript
{
  "hostname": "John-PC", // The hostname of the implant
  "username": "John", // The Username of the implant
  "localIp": "192.168.0.3", // The local IP of the implant
  "sourceIp": "", // The remote IP of the implant, this would need to be filled by the handler
  "os": "windows", // The OS of the implant
  "handler": "Direct", // The type of handler
  "implantType": "SharpImplant", // The type of implant
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
```javascript
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
```javascript
{
  "id": "9IEF644Nka5oT1oeAEE085yMKGut8y2y" // The ID of the implant
}

```

Response:
```javascript
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
```javascript
{
  "n": 0, // If the result needs to be chunked, the number of the current chunk
  "moreData": false, // If this is the last chunk
  "error": false, // If the job execution encountered an error
  "result": "", // The text result of the job, can be chunked if needed
  "jobId": "xqq5oU0lMOOTKAaMhro14FolxptVpAhY", // The Job ID
}
```

Response:
```javascript
{}
```

#### POST /implant/io
```javascript
{
  "in": "", // Data, base64 encoded
  "maxSize": 0, // A maximum of bytes to read from the pipe
  "pipe_id" : "9IEF644Nka5oT1oeAEE085yMKGut8y2y" // The id of the pipe
}
```
Response:
```javascript
{
  "out": "" // Data, base64 encoded
}
```
