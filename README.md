## Project Summary
Data inaccuracy across many systems is caused by the lack of an industrywide identifier for licensees. State licenses, association IDs and MLS IDs do not convey a single identifier that creates consistency across systems and geographies.  Both inside an individual MLS and across multiple MLSs, individual licensees are often duplicated to accommodate MLS access needs.  This problem is compounded when individuals work across state lines under unique state licenses. Listing and sales licensees are essentially without an unique identifier. This makes their activity, roster and listing and sales volume information across MLSs, advertising portals, associations, franchisors, broker back office tools, and agent services providers disjointed and unnecessarily complicated. Solving this problem requires the creation and implementation of an Unique Licensee Identifier (ULI).

Providing a unique ID to every licensed real estate professional, linked to all real estate licenses held, to create efficiency and clarity across all technology systems (association, MLS, franchisor, broker, agent and consumer-facing technology).

The RESO Unique Licensee Identifier (ULI) project seeks to create reliable identifiers that can be used by licensed participants in real estate transactions.

## Motivation
There are currently many disparate processes and touch points in dealing with licensee data. This causes data accuracy issues and difficulty integrating between systems, which themselves often compound the problem by creating their own identifiers that don't align with each other across multiple products and markets.

Real estate agents are licensed by each state, which have their own search portals to validate licensee information. At first glance, it would seem that by checking these sources at the point of entry, generally a real estate association, that downstream vendors would always have accurate data. 

However, these data sets aren't readily available and often require manual effort in validating potential licensees, which can be error prone. There can also be differences in the information used in practice compared to what a given participant was licensed with. For example, someone gets married and changes their last name in one system but not the other or they use two slightly different names across multiple markets or states, which then don't align and duplicate records are created. Another challenge is that associations and multiple listing services (MLSs) often allow many different user accounts for a given licensee. 

Issues such as these cause problems in data shares and when trying to create statistical reports for a given licensee. 

## Rationale
There are existing systems designed to deal with licensee data, but they don't provide a single source of truth that works for any potential licensee across markets. As such, they bring their own set of challenges.

The RESO Unique Licensee Identifier project aims to establish an authoritative, community-driven service that can de-duplicate licensees across markets and assign common identifiers to link their various records together without each respective system having to change to support them. As such, the impact in implementing the system will be low in terms of changes to participating systems or user behavior. 

## Requirements (Critical Success Factors):
The method MUST:
  Generate a truly unique, unchanging identifier
  Be practical to implement
  Protect and enhance personally identifiable information (PII); it cannot contain PII derived from the individual, though it MAY be associated with such information if stored and utilized in a secure manner.
  Be capable of capturing and incorporation of non-associated identifiers (manually or via automated linking via probabilistic matching)
  Be accepted and utilized as a valuable identifier by licensee, managing and owner brokers, MLSs, data syndicators, IDX and other data consumers (NAR, state licensing entities)
  Support one or multiple licenses per individual
  Be scalable
  Support versioning
  Handle multiple license authorities
  Support billions of IDs
  Be removable: PII as necessary
  Protect MLS Roster Data so that only necessary information is available in an encrypted format for the purpose of creating ULI.  To the extent that an individual’s data is visible, said data will only be visible under a high probability match.  Access to bulk roster data is not permissible.
  Be updatable: Accommodate splitting, merging, removal
  Work internationally

## Methodology
How is the ULI project different from other approaches to this problem?

It relies on two key factors:

* Scoring Algorithm
* Collaborative Filtering

### Scoring Algorithm
What is scoring and what does it do? 

Typically, those working with licensee data would write complex code in order to compare things like first and last names, with variations, and things like state license information and other identifiers in order to suggest possible matches with existing licensees at the time of entry.

However, this becomes complex and increasingly difficult to maintain as the number of conditions increases. It's also hard to change when improvements need to be made. What's needed is a scoring methodology that can be adjusted based on feedback from the system.

The RESO ULI uses a probabilistic, consensus-based approach with weighted scoring factors, where no single identifier can result in a match on its own. This allows for the system's matching accuracy to be adjusted without writing code. It also means that additional factors can be added without significant changes to the underlying system. 

Scoring allows matches above a given confidence score to be routed to the organizations that provided those records so they can resolve them in a collaborative manner.

[Read more](https://docs.google.com/document/d/10YFyqw9hIwBXPjpX6yGFQoJUHWpL5M33sVHp5sEjX-Y/edit?usp=sharing)


### Collaborative Filtering
While the scoring algorithm used for this project is simple, flexible, and powerful, it's only the first step in the process. The resolution of licensees to their unique identifiers ultimately depends on consensus being reached by users of the system. This is where the RESO ULI Service differs from other approaches.

Behind the scenes, the service consumes inbound licensee information from each participant, scores it, and coordinates the resolution process.

If no other licensee is found within the confidence threshold, a new ULI is created. However, when there are potential duplicates, notifications are sent to each organization where the record was found so they can agree on which identifier should be used. Once the resolution process is complete, any existing identifiers will be updated with references to the ones where consensus was reached. 

## How Does It Work?
Let's assume that two organizations, UOI A and UOI B, want to use the ULI service. 

The following diagram shows the ULI initialization and resolution process:

![ULI Lifecycle](https://user-images.githubusercontent.com/535358/156813229-dfa2e522-5400-4342-a6f9-ada0c38e31ea.png)


### STEP 1 - Organizations UOI A and UOI B Join the ULI Service
Licensee data for orgs UOI A and B needs to be ingested when they join the network. Any potential duplicates will be found and resolved, as needed.

### STEP 2 - New Licensee Joins UOI A
Now let's assume that a new licensee wants to join organization UOI A. The membership staff in UOI A would search for the new licensee in the ULI Service, potentially using information from their licensing board. If no match is found, a new ULI is created for the licensee. If matches are found, then each organization needs to resolve them before proceeding.

### STEP 3 - Common Licensee Identified Between UOI A and UOI B
In this case, an existing licensee was found in UOI B with a confidence of 70% or greater. The RESO ULI Service notifies UOI A and UOI B and asks them to take action. 

There are three options at this point:
* If the match isn't accurate, then UOI A can create a new ULI record and UOI B can keep their existing one. 
* Both organizations could choose to keep the existing record, in which case its ULI is used.
* Both organizations could choose to create a new ULI by merging prior and new data, which would retire the old ULI and update it to point to the new one. 

### STEP 4 - Consensus
Once the licensee has been resolved, its ULI can be used in both organizations. 

## Sample UI Screens
ULI participants will need a user interface in order to review and approve potential matches. Some initial mockups have been created to demonstrate what it might look like. 

[Read More](./docs/uli-mockups.md)

## ULI Pilot Project
There is currently a pilot project consisting of several markets and hundreds of thousands of licensees. 

The goal of the project is to test the service with real world data in order to measure the efficacy of the approach and collect metrics which will be published in a white paper.

Please [contact RESO](dev@reso.org) if you are interested in participating in the ULI Pilot.

If you'd like to run the service yourself, see [this guide](./docs/running-the-pilot.md) to get started.
