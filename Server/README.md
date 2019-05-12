## Nuages Server

### Getting started

Running the server requires the following: mongodb, node, npm.

The setup script should be sufficient to install the required dependencies and setup the connection to the database.

### Notes

 * The server is accessible over HTTP by default. A lot of setups will only make the API accessible to the localhost, with handlers implementing an encryption layer and as such will not need HTTPS. If needed it can be implemented by modifying the src/app.js file (https://docs.feathersjs.com/api/express.html#https), or by using a reverse proxy such as nginx.

 * Although multi user support is planned to be added in the future, the current version has a single user design.
