### Nuages_Cli
The command line client of Nuages.

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
  !login <username>                   Login to Nuages
  !implants [options] [id]            Manage implants
  !shell <id>                         Interact with implant
  !interactive [program] [arguments]  Create an interactive channel on the implant
  !put <id> [path]                    Start a download job on the current implant
  !get <path>                         Start an upload job on the current implant
  !files [options] [id]               Manage files
  !use <name>                         Select a module or handler
  !modules [options] [name]           Manage modules
  !run [options]                      Run the module or handler
  !autoruns [options]                 Manage autoruns
  !handlers [options] [name]          Manage handlers
  !listeners [options] [id]           Manage listeners
  !jobs [options] [id]                Manage jobs
  !tunnels [options] [id]             Manage Tunnels
  !channels [options] [id]            Manage channels
  !options [options]                  Show options
  !set [options] <key> <value>        Set an option
  !unset [options] <key>              Unset an option
  !back                               Exit implant, module and handler
  !exit|!quit                         Exit the program
  !help [command]                     Show help for a command
```

## Examples
### Code Execution
![PING3](https://user-images.githubusercontent.com/19682240/80915593-5358ff00-8d21-11ea-92db-605e2540ae35.png)
![CD3](https://user-images.githubusercontent.com/19682240/80915530-d463c680-8d20-11ea-8426-6f05b1a368f9.png)
### Reconfiguration
![CONFIG](https://user-images.githubusercontent.com/19682240/80868932-6f9a6480-8c6b-11ea-841a-362ff1ed4db2.png)
### File Downloads
![DOWNLOAD](https://user-images.githubusercontent.com/19682240/80869482-a9b93580-8c6e-11ea-9ace-f986cd505264.png)
### File Uploads
![UPLOAD](https://user-images.githubusercontent.com/19682240/80869694-e46f9d80-8c6f-11ea-90db-ebf9fe49d951.png)
### Interactive Channels
![Interactive](https://user-images.githubusercontent.com/19682240/80870359-f18e8b80-8c73-11ea-9758-9f227ca6f3e2.png)
### TCP Forwarding
![TCP](https://user-images.githubusercontent.com/19682240/80870680-12f07700-8c76-11ea-9700-f7ed969aae16.png)
### Socks Proxying
![SOCKS](https://user-images.githubusercontent.com/19682240/80871191-57c9dd00-8c79-11ea-87f9-a686353dd80c.png)


