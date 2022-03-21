# How Does It Work?
Let's assume that two organizations, UOI A and UOI B, want to use the ULI service. 

The following diagram shows the ULI initialization and resolution process:

![ULI Lifecycle](https://user-images.githubusercontent.com/535358/156813229-dfa2e522-5400-4342-a6f9-ada0c38e31ea.png)


## 1. Organizations UOI A and B Join the ULI Service
Licensee data for orgs UOI A and B needs to be ingested when they join the network. Any potential duplicates will be found and resolved, as needed.

## 2. New Licensee Joins UOI A
Now let's assume that a new licensee wants to join organization UOI A. The membership staff in UOI A would search for the new licensee in the ULI Service, potentially using information from their licensing board. If no match is found, a new ULI is created for the licensee. If matches are found, then each organization needs to resolve them before proceeding.

## 3. Common Licensee Identified Between UOI A and B
In this case, an existing licensee was found in UOI B with a confidence of 70% or greater. The RESO ULI Service notifies UOI A and UOI B and asks them to take action. 

There are three options at this point:
* If the match isn't accurate, then UOI A can create a new ULI record and UOI B can keep their existing one. 
* Both organizations could choose to keep the existing record, in which case its ULI is used.
* Both organizations could choose to create a new ULI by merging prior and new data, which would retire the old ULI and update it to point to the new one. 

## 4. Consensus
Once the licensee has been resolved, its ULI can be used in both organizations. 
