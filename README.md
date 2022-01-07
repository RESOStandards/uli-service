# ULI Pilot Search Service
ULI Service with Backend Ingest Process and Matching Service for User Deduplication.

This work uses the [Okapi BM25](https://en.wikipedia.org/wiki/Okapi_BM25) probabilistic matching algorithm for its search implementation, with a set of weights similar to those outlined in the [Sandbox document](https://docs.google.com/document/d/10YFyqw9hIwBXPjpX6yGFQoJUHWpL5M33sVHp5sEjX-Y/edit?usp=sharing) discussed in the RESO ULI Subgroup previously.


This repository contains the following items:
* A [template spreadsheet](https://github.com/RESOStandards/uli-service/blob/main/ULI%20-%20Data%20Pilot%20Template.xlsx?raw=true), which will allow you to ingest data into the ULI Pilot backend using your local data. 
* A [`docker-compose.yml` file](https://github.com/RESOStandards/uli-service/blob/main/docker-compose.yml) that will start the Elastic backend for you.
* A [text file](https://github.com/RESOStandards/uli-service/blob/main/uli-pilot-ingest.txt) containing an Elastic Ingest Pipeline for the template spreadsheet.
* A file containing a [ULI Pilot Search query](https://github.com/RESOStandards/uli-service/blob/main/uli-ranking-formula.json), which you can fill in values for once you have ingested data.

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
```docker-compose exec uli-es01 bash```
- Then run the following command to generate passwords for all the built-in users: `bin/elasticsearch-setup-passwords interactive` (This will generate a lot of files inside the docker-data-volumes folder which would contain security indices and other metadata.)

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

## 2. Ingesting Data into the Elastic Backend

Once the sheet has been filled in (step 1) and the server is running, you can use the uli-pilot-pipeline.txt file to create an [ingest pipeline](https://www.elastic.co/guide/en/elasticsearch/reference/master/ingest.html) for your data. 

If you are not familiar with Ingest Pipelines, as a shortcut, you can also use the following method to import up to 100MB of csv data and create your own Elastic index.

First, navigate to the [local instance of Kibana](http://localhost:5601/app/home#/) and look for the following: ![upload-a-file](https://user-images.githubusercontent.com/535358/121967623-8ee83a00-cd25-11eb-89a1-f93090e06431.png)

From there, you will be taken to the [File Data Visualizer](http://localhost:5601/app/ml/filedatavisualizer), which will allow you to upload the .csv version of the Excel spreadsheet template from step (1). See [this  article](https://www.elastic.co/blog/importing-csv-and-log-data-into-elasticsearch-with-file-data-visualizer) for more information.

If using this method, the ingest pattern you create will match what's in the [`uli-pilot-pipeline.txt` file](https://github.com/RESOStandards/uli-service/blob/main/uli-pilot-ingest.txt) and will be created in the [following location](http://localhost:5601/app/management/ingest/ingest_pipelines/?pipeline=uli-pilot-pipeline) in your local Elastic installation if you name it `uli-pilot-pipeline`. 

If you are using the provided template spreadsheet, the items created will match what's in this example as well as the queries. Make sure to name your index `uli-pilot` when ingesting data to match the samples.

## 3. Querying the Pilot Data
After you have ingested the data, you can query the server using Kibana's [Dev Tools](http://localhost:5601/app/dev_tools#/console). These will connect to the local Elastic instance, and provides a convenient place to try out queries. 

In this case, you'll want to use something similar to the query that's posted in the [ULI Pilot search endpoint](https://github.com/RESOStandards/uli-service/blob/main/uli-pilot-search.txt):

![dev-tools](https://user-images.githubusercontent.com/535358/121968113-7cbacb80-cd26-11eb-917d-1e5093242e09.png)

After adjusting the query for your data set, press the "play" button to see results.

