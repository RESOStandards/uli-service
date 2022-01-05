<h1 align="center">
   RESO-Certification
</h1>

### Setting up project for the first time
- Change permissions to a sub-folder `sudo chown -R 1000:1000 ./docker-data-volumes/elasticsearch`
- Run your project with the command `docker-compose up`
- While docker-compose up is running in one terminal, open another terminal to get inside the elasticsearch container by running the command:
```docker-compose exec elasticsearch bash```
- Then run the following command to generate passwords for all the built-in users: `bin/elasticsearch-setup-passwords interactive` (This will generate a lot of files inside the docker-data-volumes folder which would contain security indices and other metadata.)

The command prompt will ask you to enter password for each built-in users. Please type "`elastic`" as password for every user considering this development period.

### Setting up project for the first time

Make sure you have [Docker and Docker Compose installed](https://docs.docker.com/compose/install/). The Windows and MacOs installers bundle them both together. The referenced guide has instructions for how to get started with both. 

- Change permissions to a sub-folder `sudo chown -R 1000:1000 ./docker-data-volumes/elasticsearch`
- Run your project with the command `docker-compose up`
- While docker-compose up is running in one terminal, open another terminal to get inside the elasticsearch container by running the command:
```docker-compose exec elasticsearch bash```
- Then run the following command to generate passwords for all the built-in users: `bin/elasticsearch-setup-passwords interactive` (This will generate a lot of files inside the docker-data-volumes folder which would contain security indices and other metadata.)


This repository contains the following items:
* A [template spreadsheet](https://github.com/RESOStandards/uli-service/blob/main/ULI%20-%20Data%20Pilot%20Template.xlsx?raw=true), which will allow you to ingest data into the ULI Pilot backend using your local data. 
* A [`docker-compose.yml` file](https://github.com/RESOStandards/uli-service/blob/main/docker-compose.yml) that will start the Elastic backend for you.
* A [text file](https://github.com/RESOStandards/uli-service/blob/main/uli-pilot-ingest.txt) containing an Elastic Ingest Pipeline for the template spreadsheet.
* A file containing a [ULI Pilot Search query](https://github.com/RESOStandards/uli-service/blob/main/uli-ranking-formula.json), which you can fill in values for once you have ingested data.

# Getting Started

## 1. Preparing ULI Pilot Data for Ingest

The rest of the steps in this README are optional, but to participate in the ULI Pilot there needs to be an initial seed file created from the Member and Office data in the organization at that time. 

A [Template Spreadsheet](https://github.com/RESOStandards/uli-service/blob/main/ULI%20-%20Data%20Pilot%20Template.xlsx?raw=true) has been provided for your convenience. 

Please fill in the fields on the "Merged" tab of the spreadsheet and send the sheet to [RESO Development](mailto:dev@reso.org). Feel free to reach out with any additional questions. 

For those who are running the server locally, please proceed to the next step after filling their data into the Merged sheet.


### How to make use of the token generated from token management

The generated token can be clubbed with any API in the authorization header prefixed by the keyword: `ApiKey`.

 An example is shown below:
```
curl --location --request POST 'http://localhost:3000/api/v1/certification_reports/data_dictionary/M00000595'
--header 'Authorization: ApiKey dHhtdjR*************nbHM0UQ=='
```
### API

Log on to [http://localhost/api-docs](http://localhost/api-docs) to try api endpoints.

### Cypress tests :

#### Steps to run the specs:

##### 1. Navigate to the directory cypress-tests

##### 2. To install the required dependencies, run the command:

  `npm install`

##### 4. Command to run specs from cypress GUI:

  `npm run cy:open`

##### 5. Command to run specs from commandline:

  `npm run cy:run`

### Debugging in VSCode :

##### 1. Create Debugging Configuration in VSCode with the below JSON:
```JSON
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Docker: Attach to Node",
      "type": "node",
      "request": "attach",
      "restart": true,
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/usr/src/app",
      "protocol": "inspector"
    }
  ]
}
```

##### 2. Run your dev environment like always:
```bash
docker-compose down
docker-compose up --build
```
##### 4. Click on the play button in the debugging tab of VSCode after succesful running of app.

> Now, you can add breakpoints in your file and begin debugging.