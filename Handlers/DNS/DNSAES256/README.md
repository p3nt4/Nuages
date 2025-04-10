## DNSAES256
This PoC DNS handler uses AES256 to encrypt traffic between implants and the server.

### DNS Queries
This handler uses TXT DNS queries, with a protocol based on four types of queries.

#### N Query
This DNS query asks the server to start buffering a new request, and gets a request ID as a response.
 - **Query**: N.{endpoint}.{DATA}.domain.com
 - **Response**: N.{ID}.OK | ERROR on error
 
#### D Query
This DNS query asks the server to continue buffering a request with more data:
 - **Query**: D.{ID}.{DATA}.domain.com
 - **Response**: D.{ID}.OK | ERROR on error
 
 #### C Query
This DNS query finishes buffering a request and executes it:
 - **Query**: C.{ID}.{DATA}.domain.com
 - **Response**: C.{ID}.{HTTPCODE}.{RESPONSELENGTH}.{DATA} | ERROR on error

If a request is short enough to fit in a single C Request it can be sent like this:
 - **Query**: C.0.{endpoint}.{DATA}.domain.com

 #### M Query
This DNS loads more data from the server in case it was not fully loaded in the C response:
 - **Query**: M.{ID}.{RESUMEFROM}.domain.com
 - **Response**: {DATA} | ERROR on error



 ### Data encoding
 
#### DATA
 Data is Base64 encoded and the +,/ and = characters are replaced with -0, -1 and -2 respectively. 
 Data must be cut into into 63 character chunks separated by dots to respect the DNS protocol.
 
#### Endpoint
Endpoints are replaced by their first letters such as r for register, etc.
 
 
 

