### Nuages_Cli

## Setup
To setup the client: 
```
npm install
```

To run the client: 

```
Usage: node nuages_cli.js [options]

Options:
  -V, --version    output the version number
  -u, --url <url>  The Nuages API URI (default: "http://127.0.0.1:3030")
  --ASCII          Use ASCII tables
  -h, --help       display help for command

```

## Reference

```
 Commands:
  !login <username>             Login to Nuages
  !implants [options] [id]      Manage implants
  !shell <id>                   Interact with implant
  !interactive <id>             Create an interactive channel on the implant
  !put <id> [path]              Start a download job on the current implant
  !get <path>                   Start an upload job on the current implant
  !files [options] [id]         Manage files
  !use <name>                   Select a module or handler
  !modules [options] [name]     Manage modules
  !run [options]                Run the module or handler
  !autoruns [options]           Manage autoruns
  !handlers [options] [name]    Manage handlers
  !listeners [options] [id]     Manage listeners
  !jobs [options] [id]          Manage jobs
  !tunnels [options] [id]       Manage Tunnels
  !channels [options] [id]      Manage channels
  !options [options]            Show options
  !set [options] <key> <value>  Set an option
  !unset [options] <key>        Unset an option
  !back                         Exit implant, module and handler
  !exit|!quit                   Exit the program
  !help [command]               Show help for a command
```
