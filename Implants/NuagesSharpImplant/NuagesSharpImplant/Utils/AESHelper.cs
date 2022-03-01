using System.Text;
using System.Security.Cryptography;
using System.IO;

namespace NuagesSharpImplant.Utils
{
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

        public byte[] EncryptString(string str)
        {
            return EncryptBytes(Encoding.ASCII.GetBytes(str));
        }

        public byte[] EncryptBytes(byte[] bytes)
        {
            if (bytes.Length == 0)
            {
                return bytes;
            }
            byte[] encrypted;
            using (Rijndael rijAlg = Rijndael.Create())
            {
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
                        csEncrypt.Write(bytes, 0, bytes.Length);
                        csEncrypt.FlushFinalBlock();
                        encrypted = msEncrypt.ToArray();
                    }
                }
            }
            return encrypted;
        }

        public byte[] DecryptBytes(byte[] bytes)
        {
            if (bytes.Length == 0)
            {
                return bytes;
            }
            MemoryStream ms = new MemoryStream();
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

                        byte[] buffer = new byte[16384];
                        int bytesRead;
                        while ((bytesRead = csDecrypt.Read(buffer, 0, buffer.Length)) > 0)
                        {
                            ms.Write(buffer, 0, bytesRead);
                        }
                    }

                }
            }
            return ms.ToArray();
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
