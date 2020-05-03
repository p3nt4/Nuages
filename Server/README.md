## Nuages Server
----------------
### Requirements

Running the server requires node and npm to be installed.

A mongodb database must also be available but it can be on a different host.

### Setup script
The setup script should be sufficient to install the required dependencies and setup the connection to the database.

```
bash setup.sh
```
### Manual Installation
The Nuages Server can run on any host that supports NodeJS (Windows/Linux/Mac). 
Once node is installed the following steps can install Nuages manually.

```
# Install dependencies
npm install
# Setup Nuages
node setup.js
# Start Nuages
node src/
```


### Installing MongoDB on Kali
Installing Mongodb on Kali can be a pain. If the apt-get package does not work, the following steps can work:
```
wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian10-4.2.5.tgz
tar -xzvf mongodb-linux-x86_64-debian10-4.2.5.tgz
cd mongodb-linux-x86_64-debian10-4.2.5/bin
mkdir /data/db

# This command starts the Mongo server and must be run before running Nuages
./mongod --dbpath /data/db --logpath /var/log/mongodb/mongod.log
```
