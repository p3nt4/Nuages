## Handlers

Handlers are custom code acting as a proxy between Implants and the Nuages API, to implemenet custom communication protocols (DNS tunneling, domain fronting, IRC etc...).

Handlers can be implemented:
 - As external programs as seen in this directory
 - As modules, managed by the Nuages Server (https://github.com/p3nt4/Nuages/tree/master/Server/handlers/)
 - Or as external programs wrapped into modules
