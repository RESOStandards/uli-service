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