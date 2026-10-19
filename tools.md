---
title: Tools
permalink: /tools/
description: The reference node, the playground and the artifacts built alongside them.
---
<!-- Every link here was resolved against RESOStandards/uli-service main on
     2026-10-19. The node and client source are not published yet, so the page says
     so rather than linking a path that does not resolve; when they land, replace the
     status lines with the links. Two docs were deliberately not linked:
     docs/technical-considerations.md on main is a heading with no body, and
     docs/uli-resolution-architecture.md is not committed. -->
# Tools

## Reference Node

One node that speaks the protocol: the matcher and its scoring, the consensus arithmetic, signing and verification, and the ActivityPub surface a participant exposes to the network.

A node is the unit of participation. Running one is how an organization joins, answers broadcasts from its own data and mints identifiers under its own key.

**Status:** in progress. The protocol layer is built and the adapters over it are thin by design. The source is not yet in the public repository. What it implements is published in full as the **[specification](/specification/)**, and the pilot it was built for is described in **[running the pilot](https://github.com/RESOStandards/uli-service/blob/main/docs/running-the-pilot.md)**.

## Client

The operator's interface that runs against the reference node. A dashboard of what needs resolving, search across the roster, a comparison view for a candidate pair and the resolution screen.

**Status:** in progress, and not yet in the public repository. The screens it implements are drawn in the **[interface mockups](https://github.com/RESOStandards/uli-service/blob/main/docs/uli-mockups.md)**.

## Playground

A browser **[playground](/playground/)** runs the matcher, the scoring, the consensus arithmetic and Ed25519 signatures as specified, over the specification's worked examples or over an imported roster. Its **[source](https://github.com/RESOStandards/uli-service/tree/main/playground)** is a single page with no build step, which makes it readable as an implementation of the protocol rather than only a demonstration of it.

The network of other resolvers is modeled inside the page. There is no server: the page's security policy forbids outbound connections, so nothing loaded into the page leaves the browser.

## Artifacts

- **[Data Pilot Template](https://github.com/RESOStandards/uli-service/blob/main/ULI%20-%20Data%20Pilot%20Template.xlsx)** is the workbook a participant fills in to load a roster.
- **[Pilot ingest mapping](https://github.com/RESOStandards/uli-service/blob/main/uli-pilot-ingest.json)** reads that roster into the pilot service, column by column.
- **[Ranking formula](https://github.com/RESOStandards/uli-service/blob/main/uli-ranking-formula.json)** is the scored query the pilot ran, with the weight carried by each identifier.
- Query examples by **[first name](https://github.com/RESOStandards/uli-service/blob/main/regex-query-example-first-name.json)**, **[last name](https://github.com/RESOStandards/uli-service/blob/main/regex-query-example-last-name.json)** and **[full name](https://github.com/RESOStandards/uli-service/blob/main/regex-query-example-full-name.json)**.

The weight set and frequency table that make a score mean the same thing everywhere are published in the specification, under **[Matching Engine and Scoring](/specification/#section-29-matching-engine-and-scoring)**, and the conformance rules under **[Certification](/specification/#section-3-certification)**.

## Related

[Offer Management](https://offers.reso.org) shares the same underlying pattern. Two specifications, one federated shape.
