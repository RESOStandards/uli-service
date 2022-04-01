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


[**READ MORE**](./docs/business-requirements.md)


# Rationale
There are existing systems designed to deal with licensee data, but they don't provide a single source of truth that works for any potential licensee across markets. As such, they bring their own set of challenges.

The RESO Unique Licensee Identifier project aims to establish an authoritative, community-driven service that can de-duplicate licensees across markets and assign common identifiers to link their various records together without each respective system having to change to support them. As such, the impact in implementing the system will be low in terms of changes to participating systems or user behavior. 

# Methodology
How is the ULI project different from other approaches to this problem?

It relies on two key factors:

* Scoring Algorithm
* Collaborative Filtering

<div align="center"><img src="https://user-images.githubusercontent.com/535358/159535530-b26d290e-5a00-4c16-afea-3b5ba01f6193.svg" width="400" /></div>

## Scoring Algorithm
What is scoring and what does it do? 

Typically, those working with licensee data would write complex code in order to compare things like first and last names, with variations, and things like state license information and other identifiers in order to suggest possible matches with existing licensees at the time of entry.

However, this becomes complex and increasingly difficult to maintain as the number of conditions increases. It's also hard to change when improvements need to be made. What's needed is a scoring methodology that can be adjusted based on feedback from the system.

The RESO ULI uses a [probabilistic, consensus-based approach](https://docs.google.com/document/d/10YFyqw9hIwBXPjpX6yGFQoJUHWpL5M33sVHp5sEjX-Y/edit?usp=sharing) with weighted scoring factors, where no single identifier can result in a match on its own. This allows for the system's matching accuracy to be adjusted without writing code. It also means that additional factors can be added without significant changes to the underlying system. 

Scoring allows matches above a given confidence score to be routed to the organizations that provided those records so they can resolve them in a collaborative manner.

## Collaborative Filtering
While the scoring algorithm used for this project is simple, flexible, and powerful, it's only the first step in the process. The resolution of licensees to their unique identifiers ultimately depends on consensus being reached by users of the system. This is where the RESO ULI Service differs from other approaches.

Behind the scenes, the service consumes inbound licensee information from each participant, scores it, and coordinates the resolution process.

If no other licensee is found within the confidence threshold, a new ULI is created. However, when there are potential duplicates, notifications are sent to each organization where the record was found so they can agree on which identifier should be used. Once the resolution process is complete, any existing identifiers will be updated with references to the ones where consensus was reached. 

[**READ MORE**](./docs/how-does-it-work.md)


# Sample UI
ULI participants will need a user interface in order to review and approve potential matches. Some initial mockups have been created to demonstrate what it might look like. 

[**READ MORE**](./docs/uli-mockups.md)

# Technical Considerations
The way the ULI is implemented has an impact on its users and the overall ecosystem, as well as business considerations. 

## Decentralized
The MLS landscape is a fully decentralized environment. There are hundreds of organizations in the industry that vendors interoperate with. This is accomplished through data and API standards that allow for each market to look relatively the same even though there's not one central system. Its "nodes" are the implementers of the systems where data is entered and redistributed. 

One way to create the ULI network is to use existing RESO Data Dictionary and Web API standards. 

If choosing this approach, it might be helpful to have a registry or locator service of certified API providers that support ULI queries to help route them to various providers as well as a registry of which ULIs were resolved by which providers. 

When a new licensee record is created in a given market, a process would search all participant systems using standard Web API Core queries and ULI fields in the Data Dictionary and wait for them to resolve to see if licensees are found with a high confidence. If a match is found, all systems would need to either accept the match, combine the information into a new record, or confirm that it's not a match, and a protocol would be created to synchronize the confirmations. 

RESO has existing data models for events as well as push notification standards that could help coordinate events. Compared to the number of markets, which is roughly 500 in terms of MLSs, the number of providers is more than an order of magnitude smaller so this process could be relatively efficient, and a local search could be done first before broadcast to help eliminate potential duplicates.

A potential drawback of the approach outlined above is that queries become more complex since there's no single data source and each request has to fan out to all resolvers in the network. On the business side, this means that real time searches would only be possible on local data stores but searches in the network might take some time to complete. 

One possibility would be to use consensus-based distributed ledgers and confirmations from known sources to resolve licensee information.  amount of information participants wanted to share on the ledger. There are also potential PII questions to address, as most ledgers are meant to be immutable. This might mean that the data would be stored off-chain, in which case this could be a URL to the record on the provider, in which case access could be controlled and the record could be removed, if needed. 

If ULI information were recorded on the ledger, then any node could resolve a query if up to date. If not, then ledgers might still be a good choice for synchronizing events.

## Decentralized with ULI Registry
There are some benefits that a registry could provide in a fully decentralized topology. It could track the number of confirmations each ULI had in which market, and potentially facts about the ULI. 

This would help facilitate things like broadcasts when a key piece of information about the ULI has changed and needs to be synchronized with the others, or a ULI is found in a new market. 

## Centralized
Centralized services provide faster and simpler query resolution, but are outside of the normal RESO business model of using standards and interfaces to solve problems rather than specific implementations. And if there were a centralized solution, who would run it and would providers be willing to create solutions based on it? 

Ledgers could potentially play the same role as centralized services in this case, depending on how much the network was willing to share. If that meant the entire ULI Payload then each node would have a full copy of the information and would appear as a centralized service and could answer for any node in the network. If information could not be shared in this manner, then a ledger could be used to synchronize events so that each node would have a ULI for the records it could answer for. 

# ULI Pilot Project
There is currently a pilot project consisting of several markets and hundreds of thousands of licensees. 

The goal of the project is to test the service with real world data in order to measure the efficacy of the approach and collect metrics which will be published in a white paper.

Please [contact RESO](dev@reso.org) if you are interested in participating in the ULI Pilot.

If you'd like to run the service yourself, see [this guide](./docs/running-the-pilot.md) to get started.
