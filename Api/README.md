## API

### API Overview

Nuages is based on FeatherJS, so referring to the FeatherJS documentation is a good way to get started: https://docs.feathersjs.com/api/client.

The API can be accessed using REST or socketio.

The Nuages API is divided in two parts: 
 * The Client API, which is available for authenticated users
 * The Implant API, which is available for unauthenticated implants. 

Although unauthenticated, the implant API relies on the entropy of item IDs (32 chacters) to provide security.
