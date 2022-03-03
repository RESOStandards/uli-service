# RESO Unique Licensee Identifier (ULI)

## Summary
The RESO ULI Service seeks to create reliable identifiers that can be used by licensed participants in real estate transactions.

## Motivation
There are many touch points and disparate processes in dealing with licensee data currently. This causes data accuracy issues and difficulty integrating between systems, which themselves often compound the problem by creating their own identifiers that don't align with each other across multiple products and markets.

Real estate agents are licensed by each state, which have their own search portals to validate licensee information. At first glance, it would seem that by checking these sources at the point of entry, generally a real estate association, that downstream vendors would always have accurate data. 

However, these data sets aren't readily available and often require manual effort in validating potential licensees, which can be error prone. There can also be differences in the information used in practice versus what a given participant was licensed with. For example, someone gets married and changes their last name in one system but not the other or they use two slightly different names across multiple markets or states they're practicing in, which then don't align and duplicate records are created.

Another significant challenge is that associations and multiple listing services (MLSs) often allow many different user accounts for a given licensee. This can create problems in trying to generate reports for each user's activity in a given market.

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

Typically, those working with licensee data would write conditional logic in order to compare things like first and last names, along with variations, and things like state license information and other identifiers to suggest possible matches with existing licensees. 

However, this becomes complex to maintain and hard to reason about as the number of conditions increases. It's also hard to change when improvements need to be made. What's needed is a scoring methodology that can easily be adjusted depending on feedback from the system or to meet local needs. 

The ULI uses an approach based on primary and secondary identifiers, where no single item can result in a match on its own. This allows for scoring to be adjusted easily and in a data-driven manner, based on feedback from the system such as false positive and negative rates. It also allows for additional factors to be added without significant changes to the underlying system. 

In the context of the ULI system, scoring allows matches above a given confidence score to be routed to the organizations that provided those records so they can resolve them in a collaborative manner.


[Read more](https://docs.google.com/document/d/10YFyqw9hIwBXPjpX6yGFQoJUHWpL5M33sVHp5sEjX-Y/edit?usp=sharing)


### Collaborative Filtering
While the scoring algorithm used for this project is simple, flexible, and interesting, it's just the first step in the process. The resolution of licensees to their unique underlying records ultimately depends on consensus being reached within the system. 

Behind the scenes, the ULI service consumes inbound licensee information from each participant and runs it through the scoring process to see if it matches other records with a high degree of confidence. 

If no match is found, then a Unique Licensee Identifier is created. However, when matches are found, notifications are sent to each provider where the record was found so they can agree on which record should be used. Once they do so, a ULI can be assigned.


## ULI Pilot Project
There is currently a pilot project consisting of several markets and over a hundred thousand licensees where this service is being tested. 

The goal of the project is to test the service with real world data in order to measure the efficacy of the approach and collect matching metrics. 

Please [contact RESO](dev@reso.org) if you are interested in participating in the ULI Pilot.

If you'd like to run the service yourself, see [this guide](./docs/running-the-pilot.md) to get started.
