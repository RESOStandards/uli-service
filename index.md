---
title: Home
permalink: /
description: One stable identifier for each licensed real estate professional, resolved by a network of certified participants with no central database.
---
<!-- Landing page. Written for this site; every claim traces to the white paper's Overview
     and How It Works sections, which in turn trace to the specification.

     Audience: a real estate executive who already knows the industry. State conditions
     rather than narrate them, and assume the reader has lived the problem. -->
# The Unique Licensee Identifier

One stable identifier for each licensed real estate professional, carried alongside the identifiers everyone already has.
{:.lede}

A licensee working several markets holds a separate record in each, created independently and under names and office affiliations that rarely agree. Production splits across them, data shares carry every version, and no back office can reconcile them. Nothing identifies the records as one licensee.

The RESO Unique Licensee Identifier (ULI) is that identifier. It links a licensee's records across markets and systems. It does not merge them and it replaces nothing: every record keeps its own identity and its own local ID.

## How It Works

**No central database.** A participant asks the network whether anyone already holds a licensee. Every participant answers from its own data, and the network itself stores nothing.

**Matching is evidence, not a guess.** Each identifier that agrees counts according to how much it narrows the field. Two strong identifiers are always required, and one alone is never enough.

**Each identifier proves its own origin.** A ULI is signed by the organization that created it, and an authorized party holding the identifier can confirm that signature without calling anyone.

## Documentation

<ul class="routes">
  <li><a href="/white-paper/"><b>White Paper</b></a><span>The problem, the business case and what the ULI does and does not do.</span></li>
  <li><a href="/methodology/"><b>Methodology</b></a><span>How a licensee is resolved, step by step, with the protocol detail for implementers.</span></li>
  <li><a href="/specification/"><b>Specification</b></a><span>The ULI Resolution Protocol, RCP-54, as proposed on RESO Transport.</span></li>
  <li><a href="/guide/"><b>Guide</b></a><span>Run a node, load a roster and resolve a licensee, task by task.</span></li>
</ul>

## Playground

<!-- The workbook clause was added after the playground gained an XLSX reader; the claim
     was verified by the coordinator against the playground on 2026-10-12. -->
A **[browser playground](/playground/)** runs the matcher on sample data, or on a roster imported as a CSV file or as the pilot's template workbook. Nothing loaded into the page leaves the browser, and the page has no means of sending it anywhere.

## Pilot Program

An earlier pilot ran against real licensee data and has been taken down. RESO is rebuilding it on the protocol as specified. **[Contact RESO](mailto:dev@reso.org)** to take part.
