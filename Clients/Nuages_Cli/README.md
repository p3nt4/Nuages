### Nuages_Cli

## Setup
To setup the client: 
```
npm install
```

To run the client: 

```
./nuages_cli.sh  - Connect to http://localhost:3030
or
./nuages_cli.sh http(s)://host:port - Connect to a remote host

```

## Reference

```
 !login <username>                       - Login to Nuages
 !implants                               - List implants
 !implants <id>                          - Show an implant
 !implants <id> del                      - Delete an implant
 !implants <id> kill                     - Kill an implant
 !implants <id> config                   - Get the configuration from the implant
 !implants <id> config <option> <value>  - Reconfigure the implant
 !implant [Command..]                    - Apply the command to the current implant
 !shell <implant>                        - Start interracting with an implant
 !put <fileId> [path]                    - Start a download job on the current implant
 !get <path>                             - Start an upload job on the current implant
 cd <path>                               - Change path on the current implant
 !files                                  - List files
 !files upload <path>                    - Upload a file from the local client
 !files <id> download <path>             - Download a file to the local client
 !files <id> del                         - Delete a file
 !options                                - Show options
 !setg <option> <value>                  - Set a global option
 !set <option> <value>                   - Set a module option
 !use <path>                             - Select a module
 !modules load <path>                    - Load a module
 !modules <path> del                     - Delete a module
 !jobs                                   - Display the last jobs
 !jobs  <id>                             - Display a job and its result
 !help                                   - Print this message

```
