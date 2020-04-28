## HTTPAES256
This HTTP handler uses AES256 to encrypt traffic between implants and the server.

### Protocol Overview

- This Handler relies on POST HTTP requests and AES256 to encrypt the data
- An AES256 key is derived by generating the SHA256 hash of the pre-shared key
- The target URL (register/heartbeat/jobresult/io) is encrypted and base64 encoded, then added as the authorization header
- The json body is encrypted and sent as is in the request body
