# Overview
Data inaccuracy across many systems is caused by the lack of an industry-wide identifier for licensees. 

State licenses, association IDs and MLS IDs do not convey a single identifier that creates consistency across systems and geographies. Both inside an individual MLS and across multiple MLSs, individual licensees are often duplicated to accommodate MLS access needs.

This problem is compounded when individuals work across state lines under unique state licenses. Listing and sales licensees are essentially without an unique identifier. This makes their activity, roster and listing and sales volume information across MLSs, advertising portals, associations, franchisors, broker back office tools, and agent services providers disjointed and unnecessarily complicated. Solving this problem requires the creation and implementation of an Unique Licensee Identifier (ULI).

Providing a unique ID to every licensed real estate professional, linked to all real estate licenses held, to create efficiency and clarity across all technology systems (association, MLS, franchisor, broker, agent and consumer-facing technology).

The RESO Unique Licensee Identifier (ULI) project seeks to create reliable identifiers that can be used by licensed participants in real estate transactions.

# Motivation
There are currently many disparate processes and touch points in dealing with licensee data. This causes data accuracy issues and difficulty integrating between systems, which themselves often compound the problem by creating their own identifiers that don't align with each other across multiple products and markets.

Real estate agents are licensed by each state, which have their own search portals to validate licensee information. At first glance, it would seem that by checking these sources at the point of entry, generally a real estate association, that downstream vendors would always have accurate data. 

However, these data sets aren't readily available and often require manual effort in validating potential licensees, which can be error prone. There can also be differences in the information used in practice compared to what a given participant was licensed with. For example, someone gets married and changes their last name in one system but not the other or they use two slightly different names across multiple markets or states, which then don't align and duplicate records are created. Another challenge is that associations and multiple listing services (MLSs) often allow many different user accounts for a given licensee. 

Issues such as these cause problems in data shares and when trying to create statistical reports for a given licensee. 

# Business Requirements
TODO


[**READ MORE**](./docs/business-requirements.md)


# Rationale
There are existing systems designed to deal with licensee data, but they don't provide a single source of truth that works for any potential licensee across markets. As such, they bring their own set of challenges.

The RESO Unique Licensee Identifier project aims to establish an authoritative, community-driven service that can de-duplicate licensees across markets and assign common identifiers to link their various records together without each respective system having to change to support them. As such, the impact in implementing the system will be low in terms of changes to participating systems or user behavior. 

# Methodology
How is the ULI project different from other approaches to this problem?

It relies on two key factors:

* Scoring Algorithm
* Collaborative Filtering

[**READ MORE**](./docs/how-does-it-work.md)

<div align="center"><img src="https://user-images.githubusercontent.com/535358/159535530-b26d290e-5a00-4c16-afea-3b5ba01f6193.svg" width="400" /></div>

# Sample UI
ULI participants will need a user interface in order to review and approve potential matches. Some initial mockups have been created to demonstrate what it might look like. 

[**READ MORE**](./docs/uli-mockups.md)

# Technical Considerations
The way the ULI is implemented has impact on its users and the overall ecosystem. 

## Decentralized
The MLS landscape is a fully decentralized environment. There are hundreds of organizations in the industry that vendors interoperate with. This is accomplished through data and API standards that allow for each market to look relatively the same even though there's not one central system. Its "nodes" are the implementers of the systems where data is entered and redistributed. 

One way to create the ULI network is to use existing RESO Data Dictionary and Web API standards. If choosing this approach, it might be helpful to have a registry or locator service of API providers that support ULI queries to help route them to various providers. Certification and routine testing would also play a key role to ensure each service is operating correctly. 

RESO has existing data models for events as well as push notification standards that could help coordinate events.

A potential drawback of the decentralized approach is that queries become more complex since there's no single data source and they have to fan out to all providers. It also takes longer to resolve potential duplicates. 

## Decentralized with ULI Registry
There are some benefits that a registry could provide in a fully decentralized topology. It could track the number of confirmations each ULI had in which market. This would help facilitate things like broadcasts when a key piece of information about the ULI has changed and needs to be synchronized with the others, or a ULI is found in a new market. 

## Sources of Truth
Centralized services provide faster and simpler query resolution and a more consistent experience, but is outside of the normal RESO business model of using standards and interfaces to solve problems rather than specific implementations. And if there were to be a centralized solution, be it an API or otherwise, who would run it? 

It's possible, however, to have a common source of truth which everyone has access to and can run themselves using distributed ledgers, which can either be public and consensus based or private and permissioned.

There are different ways a ledger could be implemented to solve the problem. One option would be to use it to synchronize changes to ULI data and coordinate notifications between interested parties. Another is to use it for the event distribution and remediation process, without storing PII. Once things are written to a ledger, they're permanent. There are tradeoffs to either approach, which will impact businesses, technology providers, and users of these systems.

Such a network could even be fully autonomous, implementing the scoring, routing, and consensus protocols so that the ULI is handled by the network itself rather than any participant yet all participants would have access to the data in real time. This is an interesting direction and merits further discussion.


# ULI Pilot Project
There is currently a pilot project consisting of several markets and hundreds of thousands of licensees. 

The goal of the project is to test the service with real world data in order to measure the efficacy of the approach and collect metrics which will be published in a white paper.

Please [contact RESO](dev@reso.org) if you are interested in participating in the ULI Pilot.

If you'd like to run the service yourself, see [this guide](./docs/running-the-pilot.md) to get started.
