---
title: Home
permalink: /
description: One stable identifier for each licensed real estate professional, resolved by a network of certified participants with no central database.
---
<!-- Landing page. Written for this site; every claim traces to the white paper's Overview
     and How It Works sections, which in turn trace to the specification. -->
# The Unique Licensee Identifier

One stable identifier for each licensed real estate professional, carried alongside the identifiers everyone already has.
{:.lede}

A real estate professional licensed in one state and working two neighboring markets is one person. To the systems that touch her she is two professionals, or three. Each market gave her an account. One has her as Jennifer, the other as Jenny. Her brokerage changed hands last year, so the office name differs too. Her production splits across those records. A data share carries all of them. Her broker's back office cannot reconcile them.

Nobody made a mistake. There is simply no identifier that says *these records are the same licensee*, so every system invents one and none of them agree.

The RESO Unique Licensee Identifier (ULI) is that missing identifier. It links a licensee's records across markets and systems. It does not merge them, and it replaces nothing: every record keeps its own identity and its own local ID.

## Three Things Worth Knowing

**There is no central database.** A participant asks the network whether anyone already holds a licensee, every participant answers from its own data, and the network itself stores nothing.

**Matching is evidence, not a guess.** Each identifier that agrees counts according to how much it narrows the field. Two strong identifiers are always required, and one alone is never enough.

**Each identifier proves its own origin.** A ULI is signed by the organization that created it, and an authorized party holding the identifier can confirm that signature without calling anyone.

## Where to Go Next

<ul class="routes">
  <li><a href="/white-paper/">White Paper</a><span>The problem, the business case and what the ULI does and does not do.</span></li>
  <li><a href="/methodology/">Methodology</a><span>How a licensee is resolved, step by step, with the protocol detail for implementers.</span></li>
  <li><a href="/specification/">Specification</a><span>The ULI Resolution Protocol, RCP-54, as proposed on RESO Transport.</span></li>
  <li><a href="/guide/">Guide</a><span>Run a node, load a roster and resolve a licensee, task by task.</span></li>
</ul>

## Try It

<!-- The workbook clause was added after the playground gained an XLSX reader; the claim
     was verified by the coordinator against the playground on 2026-10-12. -->
A **[browser playground](/playground/)** runs the real matcher on sample data, or on a roster you import yourself, as a CSV file or as the pilot's template workbook. Nothing you load leaves your browser, and the page has no way to send it anywhere.

## The Pilot

An earlier pilot ran against real licensee data and has been taken down. RESO is rebuilding it on the protocol as specified. **[Contact RESO](mailto:dev@reso.org)** if you would like to take part.
