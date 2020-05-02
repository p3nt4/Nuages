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
 Commands:
  !login <username>             Login to Nuages
  !implants [options] [id]      Manage implants
  !implant [options]            Apply the !implants command to the current implant
  !shell <id>                   Interact with implant
  !interactive                  Create an interactive channel on the implant
  !put <id> [path]              Start a download job on the current implant
  !get <path>                   Start an upload job on the current implant
  !files [options] [id]         Manage files
  !options [options]            Show options
  !set [options] [key] [value]  Set an option
  !unset [options] [key]        Unset an option
  !use <name>                   Select a module or handler
  !modules [options] [name]     Manage modules
  !run                          Run the module or handler
  !autorun                      Autorun this module on new implants
  !autoruns                     Manage autoruns
  !handlers [options] [name]    Manage handlers
  !jobs [options] [id]          Manage jobs
  !listeners [id]               Manage listeners
  !tunnels [options] [id]       Manage Tunnels
  !channels [options] [id]      Manage channels
  !back                         Exit implant, module and handler
  !exit|!quit                   Exit the program
  !help [command]               Show help

```
