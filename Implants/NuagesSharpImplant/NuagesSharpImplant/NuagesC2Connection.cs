using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace NuagesSharpImplant
{
    public interface NuagesC2Connection
    {
        string POST(string url, string jsonContent);

        string getConnectionString();

        string getHandler();

        int getBufferSize();

        int getRefreshRate();
    }
}
