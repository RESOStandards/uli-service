# ULI Service API
The ULI API provides ingest, search, and approval services. The backend uses NodeJS/Express and Elasticsearch.

## Getting Started

**Step 1**: To run the server, first clone the repository

```
git clone https://github.com/RESOStandards/uli-service.git
```

<br />

**Step 2**: Make sure that Docker is installed and running
[See documentation](https://docs.docker.com/get-docker/).

<br />

**Step 3**: Start API and Elasticsearch from `docker-compose.yml` in the project root

```
docker-compose up -d --build
```

The server takes a little while to start the first time. 

The `-d` flag creates the service in a daemon process, meaning that the logs will not be displayed. To view them, issue the following command: 

```
docker-compose logs --follow
```

You can also use `grep` to filter for only nodejs (API) processes:

```
docker-compose logs --follow | grep nodejs
```

<br />

# Accessing Elastic through Kibana
Once the server has successfully started, you can access the Kibana dashboard at:

```
http://localhost:5601
```

There is currently no auth set up on the Elastic instance, so no credentials are required.

You can perform queries using the Dev Tools at the following URL:

```
http://localhost:5601/app/dev_tools#/console
```

Elastic uses a RESTful API and JSON-based query DSL. For more information regarding queries, see the [Elasticsearch documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-search.html).

To get data from a given index, the request would be:

```
GET /<index-name>/_search
```

The ULI Service uses an index called `uli-service`. 

There won't be any indexes available when the server is first started, so you'll get a `404` error until you ingest some data, at which point the index will automatically be created.


## Available Services
The following services are currently available in the ULI Pilot.

### Bulk Ingest API
Ingests one or more records and marks their status `unprocessed`. 

Requires a valid provider organizational identifier (providerUOI). For example, `M0000033`.

**REQUEST**
```
POST http://localhost/uli-service/v1/ingest/M0000033
[
    {
        "MemberFullName": "ohai2 ohai",
        "MemberLastName": "ohai",
        "MemberFirstName": "ohai2",
        "MemberMiddleInitial": "ohai",
        "MemberNickname": "ohai",
        "MemberType": "ohai",
        "MemberNationalAssociationId": "ohai",
        "MemberStateLicense": "ohai",
        "MemberStateLicenseType": "ohai",
        "MemberStateLicenseState": "ohai",
        "MemberMlsId": "ohai",
        "OfficeName": "ohai",
        "OfficeMlsId": "ohai",
        "SourceSystemID": "ohai",
        "SourceSystemName": "ohai",
        "OriginatingSystemID": "ohai",
        "OriginatingSystemName": "ohai"
    }
]
```

**RESPONSE**
```json
{
    "statusCode": 200,
    "body": {
        "itemsProcessed": 1
    }
}
```

### Search API
The Search API is currently a work in progress, but will return everything in the `uli-service` index at the moment, if present.

**REQUEST**
```
GET http://localhost/uli-service/v1/search
```

**RESPONSE**
```json
{
  "statusCode": 200,
  "body": [
    {
      "_index": "uli-service",
      "_id": "BPA_F4YBcOSSsEKdxGcu",
      "_score": 1,
      "_source": {
        "ingestTimestamp": "2023-02-03T12:28:20.321Z",
        "providerUoi": "M0000032",
        "MemberFullName": "ohai323",
        "MemberLastName": "ohai",
        "MemberFirstName": "ohai2",
        "MemberMiddleInitial": "ohai",
        "MemberNickname": "ohai",
        "MemberType": "ohai",
        "MemberNationalAssociationId": "ohai",
        "MemberStateLicense": "ohai",
        "MemberStateLicenseType": "ohai",
        "MemberStateLicenseState": "ohai",
        "MemberMlsId": "ohai",
        "OfficeName": "ohai",
        "OfficeMlsId": "ohai",
        "SourceSystemID": "ohai",
        "SourceSystemName": "ohai",
        "OriginatingSystemID": "ohai",
        "OriginatingSystemName": "ohai"
      }
    }
  ]
}
```

### Direct Access to Elastic Indexes
There is also direct access to the Elastic indexes from the ULI API.

**REQUEST**
```
GET http://localhost:9200/uli-service/_search?size=1
```

**RESPONSE**
```json
{
    "took": 0,
    "timed_out": false,
    "_shards": {
        "total": 1,
        "successful": 1,
        "skipped": 0,
        "failed": 0
    },
    "hits": {
        "total": {
            "value": 3,
            "relation": "eq"
        },
        "max_score": 1.0,
        "hits": [
            {
                "_index": "uli-service",
                "_id": "nKFVGIYBpMOBVjljmZu8",
                "_score": 1.0,
                "_source": {
                    "ingestTimestamp": "2023-02-03T17:31:48.466Z",
                    "providerUoi": "M0000033",
                    "status": "unprocessed",
                    "MemberFullName": "ohai323",
                    "MemberLastName": "ohai",
                    "MemberFirstName": "ohai2",
                    "MemberMiddleInitial": "ohai",
                    "MemberNickname": "ohai",
                    "MemberType": "ohai",
                    "MemberNationalAssociationId": "ohai",
                    "MemberStateLicense": "ohai",
                    "MemberStateLicenseType": "ohai",
                    "MemberStateLicenseState": "ohai",
                    "MemberMlsId": "ohai",
                    "OfficeName": "ohai",
                    "OfficeMlsId": "ohai",
                    "SourceSystemID": "ohai",
                    "SourceSystemName": "ohai",
                    "OriginatingSystemID": "ohai",
                    "OriginatingSystemName": "ohai"
                }
            }
        ]
    }
}
```