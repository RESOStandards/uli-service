## Summary
The RESO Unique Licensee Identifier (ULI) project seeks to create reliable identifiers that can be used by licensed participants in real estate transactions.

## Motivation
There are currently many disparate processes and touch points in dealing with licensee data. This causes data accuracy issues and difficulty integrating between systems, which themselves often compound the problem by creating their own identifiers that don't align with each other across multiple products and markets.

Real estate agents are licensed by each state, which have their own search portals to validate licensee information. At first glance, it would seem that by checking these sources at the point of entry, generally a real estate association, that downstream vendors would always have accurate data. 

However, these data sets aren't readily available and often require manual effort in validating potential licensees, which can be error prone. There can also be differences in the information used in practice compared to what a given participant was licensed with. For example, someone gets married and changes their last name in one system but not the other or they use two slightly different names across multiple markets or states, which then don't align and duplicate records are created. Another challenge is that associations and multiple listing services (MLSs) often allow many different user accounts for a given licensee. 

Issues such as these cause problems in data shares and when trying to create statistical reports for a given licensee. 

## Rationale
There are existing systems designed to deal with licensee data, but they don't provide a single source of truth that works for any potential licensee across markets. As such, they bring their own set of challenges.

The RESO Unique Licensee Identifier project aims to establish an authoritative, community-driven service that can de-duplicate licensees across markets and assign common identifiers to link their various records together without each respective system having to change to support them. As such, the impact in implementing the system will be low in terms of changes to participating systems or user behavior. 

## Methodology
How is the ULI project different from other approaches to this problem?

It relies on two key factors:

* Scoring Algorithm
* Collaborative Filtering

### Scoring Algorithm
What is scoring and what does it do? 

Typically, those working with licensee data would write complex code in order to compare things like first and last names, with variations, and things like state license information and other identifiers in order to suggest possible matches with existing licensees at the time of entry.

However, this becomes complex to maintain and hard to reason about as the number of conditions increases. It's also hard to change when improvements need to be made. What's needed is a scoring methodology that can be adjusted based on feedback from the system.

The RESO ULI uses a probabilistic, consensus-based approach with weighted scoring factors, where no single identifier can result in a match on its own. This allows for the system's matching accuracy to be adjusted without writing code. It also means that additional factors can be added without significant changes to the underlying system. 

Scoring allows matches above a given confidence score to be routed to the organizations that provided those records so they can resolve them in a collaborative manner.

[Read more](https://docs.google.com/document/d/10YFyqw9hIwBXPjpX6yGFQoJUHWpL5M33sVHp5sEjX-Y/edit?usp=sharing)


### Collaborative Filtering
While the scoring algorithm used for this project is simple, flexible, and powerful, it's only the first step in the process. The resolution of licensees to their unique identifiers ultimately depends on consensus being reached by users of the system. This is where the RESO ULI Service differs from other approaches.

Behind the scenes, the service consumes inbound licensee information from each participant, scores it, and coordinates the resolution process.

If no other licensee is found within the confidence threshold, a new ULI is created. However, when there are potential duplicates, notifications are sent to each organization where the record was found so they can agree on which identifier should be used. Once the resolution process is complete, any existing identifiers will be updated with references to the ones where consensus was reached. 


## ULI Pilot Project
There is currently a pilot project consisting of several markets and hundreds of thousands of licensees. 

The goal of the project is to test the service with real world data in order to measure the efficacy of the approach and collect metrics which will be published in a white paper.

Please [contact RESO](dev@reso.org) if you are interested in participating in the ULI Pilot.

If you'd like to run the service yourself, see [this guide](./docs/running-the-pilot.md) to get started.
