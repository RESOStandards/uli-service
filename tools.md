---
title: Tools
permalink: /tools/
description: The reference node, the playground and the artifacts built alongside them.
---
<!-- DRAFT for Josh. Links are placeholders until the reference artifacts land
     in the repository. Everything described here exists on disk today. -->
# Tools

## Reference Node

One node that speaks the protocol: the matcher and its scoring, the consensus arithmetic, signing and verification, and the ActivityPub surface a participant exposes to the network.

A node is the unit of participation. Running one is how an organization joins, answers broadcasts from its own data, and mints identifiers under its own key.

**Status:** in progress. The protocol layer is built and the adapters over it are thin by design.

[REPOSITORY LINK]

## Client

The operator's interface that runs against the reference node. A dashboard of what needs resolving, search across the roster, a comparison view for a candidate pair, and the resolution screen.

[REPOSITORY LINK]

## Playground

A browser [playground](/playground/) runs the real matcher, the real scoring, the real consensus arithmetic and real Ed25519 signatures, over the specification's worked examples or over a roster you import.

The network of other resolvers is modeled inside the page. There is no server: the page's security policy forbids outbound connections, so nothing you load leaves your browser.

## Artifacts

A CSV and workbook template for loading a roster, the published weight set and frequency table that make a score mean the same thing everywhere, and the certification rules.

[ARTIFACT LINKS]

## Related

[Offer Management](https://offers.reso.org) shares the same underlying pattern. Two specifications, one federated shape.
