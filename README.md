<h1 align="center">
   RESO-Certification
</h1>

# Getting Started

## 1. Preparing ULI Pilot Data for Ingest

Please fill in the fields on the "Merged" tab of the spreadsheet and send the sheet to [RESO Development](mailto:dev@reso.org). Feel free to reach out with any additional questions. 

For those who are running the server locally, please proceed to the next step after filling their data into the Merged sheet.

### Requirements

- Docker version 20.10.8
- docker-compose version 1.29.2

Since we are using the docker-compose version 3.9, these are the minimum supported versions of these programs.

Make sure you have [Docker and Docker Compose installed](https://docs.docker.com/compose/install/). The Windows and MacOs installers bundle them both together. The referenced guide has instructions for how to get started with both. 

### Setting up project for the first time

- Change permissions to a sub-folder `sudo chown -R 1000:1000 ./docker-data-volumes/elasticsearch`
- run the command `docker-compose -f create-certs.yml run --rm create_certs` to create self-signed certificates.
- Make a `kibana.yml` file in the root.  A simple version is provided and you may use it with the command `cp kibana.yml.sample kibana.yml`
- Run your project with the command `docker-compose up`
- While docker-compose up is running in one terminal, open another terminal to get inside the elasticsearch container by running the command:
```docker-compose exec elasticsearch bash```
- ./bin/elasticsearch-certutil http
- Then run the following command to generate passwords for all the built-in users: `bin/elasticsearch-setup-passwords interactive --url https://localhost:9200` (This will generate a lot of files inside the docker-data-volumes folder which would contain security indices and other metadata.)

The command prompt will ask you to enter password for each built-in users. Please type "`elastic`" as password for every user considering this development period.

You can now use the credentials:
```
username: elastic
password: elastic
```
to login to your app as admin.

### Developing with a non-localhost setup

You need to edit the docker-compose.yml file and uncomment the SERVER_HOST lines.  Make sure the value given is that of your development server.

### How to make use of the token generated from token management

The generated token can be clubbed with any API in the authorization header prefixed by the keyword: `ApiKey`.

 An example is shown below:
```
curl --location --request POST 'http://localhost:3000/api/v1/certification_reports/data_dictionary/M00000595'
--header 'Authorization: ApiKey dHhtdjR*************nbHM0UQ=='
```
### How to make use of the token generated from token management

The generated token can be clubbed with any API in the authorization header prefixed by the keyword: `ApiKey`.

 An example is shown below:
```
curl --location --request POST 'http://localhost:3000/api/v1/certification_reports/data_dictionary/M00000595'
--header 'Authorization: ApiKey dHhtdjR*************nbHM0UQ=='
```
### API

Log on to [http://localhost/api-docs](http://localhost/api-docs) to try api endpoints.


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