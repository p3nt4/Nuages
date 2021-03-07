# Nuages
Nuages is a modular C2 framework.


Refer to the [Wiki](https://github.com/p3nt4/Nuages/wiki) for documentation and tutorials, do not hesitate to open issues for help, bug reports or feature requests

![Nuages_Cli - Copy](https://user-images.githubusercontent.com/19682240/80042830-104f8e00-84ce-11ea-90bc-233acc646f11.png)


## Introduction

Nuages aims at being a C2 framework in which back end elements are open source, whilst implants and handlers must be developed ad hoc by users. As a result, it does not provide a way to generate implants, but an open source framework to develop and manage compatible implants that can leverage all the back end resources already developed. Nuages does abstraction of the different layers so that paylaods implemented are indifferent to the handlers and implants that are used to carry them.

This design hopes to facilitate penetration testing by facilitating the development of custom implants and reducing the likelihood of implants being detected by defensive solutions.

For testing and refererence, example implants and handlers are provided on this repo. A tutorial on writing implants is also available in the [Wiki](https://github.com/p3nt4/Nuages/wiki/Tutorial:-Creating-a-custom-full-featured-implant).

Contribution are welcome.

## Capabilities
Nuages can be easily be extended with modules to perform anything desired. At the moment, the following payloads are implemented in the example implants:
- Command Execution
- Interactive Channels
- File Upload/Download
- TCP Forwarding
- Socks Tunneling
- Reflected Assembly Execution
- Powershell Execution

https://github.com/p3nt4/Nuages/wiki/Job-Payloads

Nuages does abstraction of the handler level so that payloads can be executed over any communication method. New handlers can easily be implemented and will support all the  paylaods mentioned above. The following handlers are available in this repo:
 - HTTP
 - SLACK
 - DNS

## Architecture
![Nuages](https://user-images.githubusercontent.com/19682240/56617113-ffcfb380-65ec-11e9-99ca-fc0e674d4dcd.PNG)

**Nuages C2:** It is the core of the C2 and manages the implants, it is open source and should not need to be customized. It exposes the Nuages API, accessible over REST or Socket.io.

**Implants:** Custom code to run on the target devices, they can communicate with handlers over custom protocol or directly with the Nuages API.

**Handlers:** Custom code acting as a proxy between Implants and the Nuages API, to implement custom communication protocols (DNS tunneling, domain fronting, IRC etc...).

**Clients:** Clients rely on the Nuages API and can be implemented in any form such as cli or web application.


## Disclaimer
This project is intended for security researchers and penetration testers and should only be used with the approval of system owners.


