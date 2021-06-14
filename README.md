# uli-service
ULI Service with Backend Ingest Process and Matching Service

This repository contains the following items:
* A [template spreadsheet](https://github.com/RESOStandards/uli-service/blob/main/ULI%20-%20Data%20Pilot%20Template.xlsx?raw=true), which will allow you to ingest data into the ULI Pilot backend using your local data. 
* A [`docker-compose.yml` file](https://github.com/RESOStandards/uli-service/blob/main/docker-compose.yml) that will start the Elastic backend for you.
* A [text file](https://github.com/RESOStandards/uli-service/blob/main/uli-pilot-ingest.txt) containing an Elastic Ingest Pipeline for the template spreadsheet.
* A file containing a [ULI Pilot Search query](https://github.com/RESOStandards/uli-service/blob/main/uli-pilot-search.txt), which you can fill in values for once you have ingested data.

**1. Preparing ULI Pilot Data for Ingest**
The rest of the steps in this README are optional, but to participate in the ULI Pilot there needs to be an initial seed file created from the Member and Office data in the organization at that time. 

A [Template Spreadsheet](https://github.com/RESOStandards/uli-service/blob/main/ULI%20-%20Data%20Pilot%20Template.xlsx?raw=true) has been provided for your convenience. 

Please fill in the fields on the "Merged" tab of the spreadsheet and send the sheet to [RESO Development](mailto:dev@reso.org). Feel free to reach out with any additional questions. 

For those who are running the server locally, please proceed to the next step after filling their data into the Merged sheet.


**2. Starting the Elastic Backend**
Make sure you have [Docker and Docker Compose installed](https://docs.docker.com/compose/install/). The Windows and MacOs installers bundle them both together. The referenced guide has instructions for how to get started with both. 

Once Docker Compose is installed, change into the directory where you downloaded this source code and type the following command with the Docker service running:
```
  docker-compose up
```
This will build containers with the backend environment for you locally the first time it's run, or if the containers are ever removed. You will see a lot of output in your console during this time. 

The containers that are built will maintain the state of their data beyond a restart.

**3. Ingesting Data into the Elastic Backend**
Once the sheet has been filled in (step 1) and the server is running, you can use the uli-pilot-pipeline.txt file to create an [ingest pipeline](https://www.elastic.co/guide/en/elasticsearch/reference/master/ingest.html) for your data. 

If you are not familiar with Ingest Pipelines, as a shortcut, you can also use the Data Visualizer ([located here once your Elastic server is running](http://localhost:5601/app/ml/datavisualizer)) to import data up to 100MB and create your own Elastic "Index" (database) using that data. See the [following article](https://www.elastic.co/guide/en/elasticsearch/reference/master/ingest.html) for more information. 

If using this method, the ingest pattern you create will match what's in the `uli-pilot-pipeline.txt` file above and will be created in the [following location](http://localhost:5601/app/management/ingest/ingest_pipelines/?pipeline=uli-pilot-pipeline) in your local Elastic installation if you name it `uli-pilot-pipeline`.

If you are using the provided template spreadsheet, the items created will match what's in this example as well as the queries. Make sure to name your index `uli-pilot` when ingesting data to match the samples.
