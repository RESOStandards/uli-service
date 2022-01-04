# ULI Pilot Search Service
ULI Service with Backend Ingest Process and Matching Service for User Deduplication.

This work uses the [Okapi BM25](https://en.wikipedia.org/wiki/Okapi_BM25) probabilistic matching algorithm for its search implementation, with a set of weights similar to those outlined in the [Sandbox document](https://docs.google.com/document/d/10YFyqw9hIwBXPjpX6yGFQoJUHWpL5M33sVHp5sEjX-Y/edit?usp=sharing) discussed in the RESO ULI Subgroup previously.


### Setting up project for the first time

Make sure you have [Docker and Docker Compose installed](https://docs.docker.com/compose/install/). The Windows and MacOs installers bundle them both together. The referenced guide has instructions for how to get started with both. 

- Change permissions to a sub-folder `sudo chown -R 1000:1000 ./docker-data-volumes/elasticsearch`
- Run your project with the command `docker-compose up`
- While docker-compose up is running in one terminal, open another terminal to get inside the elasticsearch container by running the command:
```docker-compose exec elasticsearch bash```
- Then run the following command to generate passwords for all the built-in users: `bin/elasticsearch-setup-passwords interactive` (This will generate a lot of files inside the docker-data-volumes folder which would contain security indices and other metadata.)

The command prompt will ask you to enter password for each built-in users. Please type "`elastic`" as password for every user considering this development period.

You can now use the credentials:
```
username: elastic
password: elastic
```
to login to your app as admin.

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