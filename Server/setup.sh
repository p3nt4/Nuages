#!/bin/bash
command -v npm >/dev/null 2>&1 || { echo >&2 "npm required.  Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "node required.  Aborting."; exit 1; }

printf "Installing local npm dependencies...\n";
npm install & > /dev/null ;

if [ $? -eq 0 ]; then
    echo "Done!"
else
    echo "FAILED !"
    exit 1
fi

printf "Adding support for gridfs...\n";
cp src/mongodb.js.grid src/mongodb.js

if [ $? -eq 0 ]; then
    echo "Done!"
else
    echo "FAILED !"
    exit 1
fi

printf "Configuring Nuages:\n";
node ./setup.js
if [ $? -eq 0 ]; then
    echo "Success!";
else
    echo "FAILED!";
	exit 1;
fi


