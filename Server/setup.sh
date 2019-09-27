#!/bin/bash
command -v mongo >/dev/null 2>&1 || { echo >&2 "mongo required.  Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "npm required.  Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "node required.  Aborting."; exit 1; }

printf "\n\nInstalling local npm dependencies\n";
npm install 2&>1 >/dev/null;

if [ $? -eq 0 ]; then
    echo "Done!"
else
    echo "FAILED !"
    exit 1
fi

#printf "\n\nInstalling feathers cli\n";
#npm install @feathersjs/cli  2&>1 >/dev/null;

#if [ $? -eq 0 ]; then
#    echo "Done!"
#else
#    echo "FAILED !"
#    exit 1
#fi

command -v ./node_modules/@feathersjs/cli/bin/feathers.js >/dev/null 2>&1 || { printf >&2 "\n\nFeathers-cli install failed.  Aborting."; exit 1; }

printf "\n\nSetting up database, select mongodb and enter connection string:\n"
./node_modules/@feathersjs/cli/bin/feathers.js generate connection;

if [ $? -eq 0 ]; then
    echo "Done!"
else
    echo "FAILED !"
    exit 1
fi


printf "\n\nAdding support for gridfs...\n";
cp src/mongodb.js.grid src/mongodb.js

if [ $? -eq 0 ]; then
    echo "Done!"
else
    echo "FAILED !"
    exit 1
fi

printf "\n\nSetting up authentication, select local and users:\n";
./node_modules/@feathersjs/cli/bin/feathers.js generate authentication;

if [ $? -eq 0 ]; then
    echo "Done!"
else
    echo "FAILED !"
    exit 1
fi

printf "\n\nSetting up for production mode...\n";
cp config/default.json config/production.json

if [ $? -eq 0 ]; then
    echo "Done!";
else
    echo "FAILED !";
    exit 1;
fi

printf "\n\nWhat should be the username of the Nuages user:\n";
read user;

printf "\n\nWhat should be the password of the Nuages user:\n";
read password;

printf "\n\nDisabling authentication";
cp src/services/users/users.hooks.js.noauth src/services/users/users.hooks.js

printf "\n\nStarting the server in the background\n";
node src/ &

sleep 5;

printf "\n\nCreating the user\n";
curl 'http://localhost:3030/users/' \
-H 'Content-Type: application/json' \
--data-binary @<(cat <<EOF
{
  "email": "$user",
  "password": "$password"
  }
EOF
)

if [ $? -eq 0 ]; then
    echo "Success!"
else
    echo "FAILED ! Doesnt look like the user was created"
fi

printf "\n\nEnabling authentication\n";
cp src/services/users/users.hooks.js.auth src/services/users/users.hooks.js

if [ $? -eq 0 ]; then
    echo "Done!"
else
    echo "FAILED ! THE SERVER MIGHT NOT HAVE AUTHENTICATION ENABLED";
fi

printf "\n\n Killing the node server...\n\n"
kill $(pgrep -f "node src/")

if [ $? -eq 0 ]; then
    echo "Done!";
else
    echo "FAILED ! The Nuages server might still be running without authentication, make sure to restart it";
	exit 1;
fi


