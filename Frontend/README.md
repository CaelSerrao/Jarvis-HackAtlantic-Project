# Frontend Directory

This directory is for **Frontend work only**.

Place final project Frontend files and production-ready code here.


## Project Aim

This project aims to create a one-stop shop tech assistant. Leveraging the use of a large LLM and a locally hosted LLM to handle audio commands from users and either execute the request from a file of function or making an API call to a larger LLM to generate the required function

## Required Segments (Tentative)

The required segments include:

- Electron + React app for receiving and handling function and function generation
- Locally hosted LLM (llama.cpp) for handling the processing of received audio commands
    - This will run on a persistent server that will boot on startup
- Agents that take care of handling unseen requests
- Security systems for automatic error checking
- Security systems for user error checking and correction
- Database for storing key information
- Database for storing conversations 

## Project Resources

**Proposed Flow Diagram**

![Proposed Flow Diagram](./updated_flow_diagram.png)

**Proposed User Experience**

![Proposed User Experience](./Jarvis_user_experience.png)

**Proposed front End**

![Proposed front End](./Jarvis_proposed_frontend.png)

