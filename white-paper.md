---
title: White Paper
permalink: /white-paper/
description: Why the industry needs one identifier for each licensed professional, and what the RESO Unique Licensee Identifier does and does not do.
---
<!-- Copied by script from the white paper draft of 2026-10-12. Removed: the draft banner
     and the author's working notes at the end, which were not
     content.
     Changed: two links repointed to site paths (/methodology/ and /playground/); the
     field table's empty placeholder header row dropped so it renders without a header. -->
# The RESO Unique Licensee Identifier

## Overview

A licensee working several markets holds a separate record in each, created independently and under
names and office affiliations that rarely agree. Production splits across those records, data shares
carry every version, and no back office can reconcile them. Forms providers, lockbox systems and
education records each hold a different version of the same person.

Nothing identifies the records as one licensee, so each system creates its own identifier and none
of them align.

State licenses, association IDs and MLS IDs do not solve this. None conveys a single identifier that
holds across systems and geographies, and inside a single MLS a licensee is often duplicated
deliberately to accommodate the access they need. The problem compounds when someone works across
state lines under separate state licenses.

The RESO Unique Licensee Identifier is one stable identifier for each licensed real estate
professional, carried alongside the identifiers everyone already has rather than replacing any of
them.

## What the ULI Does, and What It Does Not

**It links. It does not merge.**

MLSs duplicate licensee records deliberately, to grant the access a licensee requires. Those
duplicates are not a defect to be corrected. The ULI gives each of them a common identifier, so
every record keeps its own identity and its own local ID while also recording which person it
belongs to.

Nothing is flattened and nothing is removed. A system that rolls up one licensee's production
across markets can do so. A system with no use for it can ignore the field.

**No one surrenders control of their data.** A participant shares only the subset of fields it
chooses, with the participants it chooses, and the network itself stores nothing. There is no
central database of licensees.

## Motivation

Licensee data today passes through many disconnected processes and touch points. That causes
accuracy problems and makes integration difficult, and the systems involved often compound it by
creating their own identifiers that do not align across products or markets.

Licensing is a state function, and each state runs its own portal for validating a licensee. At
first glance, checking those sources at the point of entry, usually at an association, would give
every downstream vendor accurate data. In practice those data sets are not readily available and
validation often requires manual effort, which is error prone.

There are also honest differences between what a licensee was licensed under and what they use day
to day. Someone marries and changes their last name in one system but not another. Someone uses two
slightly different names across markets or states. Associations and MLSs frequently allow several
accounts for the same licensee. Each of these produces duplicate records, and the duplicates make
data shares harder and statistical reporting unreliable.

Existing efforts at a unique identifier miss a large share of licensees, because each focuses on
either association membership or an individual state license number. The processes that create those
numbers are also prone to human error, as individuals holding several supposedly unique identifiers
demonstrate.

Vendors have built their own solutions. What the industry needs is a consistent standard, which
means combining technology with organizational cooperation.

## Business Requirements

### For Data Shared Between Organizations

**Data shares.** Duplicate identifiers inside one MLS compound every problem above once the data is
fed through a share.

**Licensee interoperability across products.** Multiple records make it difficult for a licensee to
link their account information across the platforms available to them. Forms, comparative market
analysis software, showing systems, lockboxes, single sign-on products and broker back office
systems all suffer as a result.

### For an Organization's Own Reporting

**Statistical reports.** Production and market share reporting suffers when one individual has
several identifiers, because their productivity cannot be accounted for under one. A genuinely
unique identifier links all of a licensee's records so the data reflects all of their productivity.

**Transactional history.** Licensees work in several markets over a career, often with different
companies, so combining transactions across their identifiers is difficult to do confidently.

**A unified educational profile.** Designations, certifications, educational credits and policy
compliance are all harder to track when the underlying data spans several licensee records.

## The Original Requirements, and Where the Protocol Landed Differently

These are the requirements set out when the work began. They shaped the design and are kept here for
that reason, but **RCP-54 answered several of them differently**, and the differences are named below
the list so this section cannot be read as a statement of what the protocol does.

The method was to

- Generate a truly unique, unchanging identifier.
- Be practical to implement.
- Protect personally identifiable information. The identifier itself cannot contain PII derived from
  the individual, though it MAY be associated with such information where that is stored and used
  securely.
- Capture and incorporate identifiers that are not yet associated, whether manually or by automated
  matching.
- Be accepted and used as valuable by licensees, managing and owner brokers, MLSs, data syndicators,
  IDX providers and other data consumers.
- Support one or several licenses per individual.
- Be scalable.
- Support versioning.
- Handle multiple licensing authorities.
- Accommodate splitting, merging and removal.
- Allow PII to be removed as necessary.
- Protect MLS roster data, so that only the information necessary to create a ULI is available.

**Where RCP-54 differs.** Five of these need reading against the specification rather than as
current statements.

| The original requirement | What RCP-54 does |
| :---- | :---- |
| An identifier that is **unchanging** | The identifier string is immutable once minted (§3.2), but a licensee's ULI can be superseded by a merge or a redirect. The specification calls the system **eventually consistent** (§1) |
| Matching by **probability**, and data visible only under a **high probability match** | The score is deliberately **not** a probability. §6 states that a percentage scale "would invite reading the number as a calibrated probability, which it is not." What is gated on a match is a candidate's record in a reply (§2.5); the originator's own shared subset is read by every authorized resolver before any match exists, because that is how matching happens (§2.1) |
| Roster data available **only in an encrypted format** | The mechanism is an OAuth2-protected link (§2.1, §2.11), not encryption of the payload |
| **No access to bulk roster data** | True on the production network. In the certification sandbox, and only there, a candidate grants RESO access to its data set so every record can be scored against the reference oracle (§3.1) |
| Support **removal** of an identifier | There is no removal. A tombstone redirects and "never deletes data" (§2.12.3). The only deletion in the protocol is of thread messages, for PII (§2.4) |

## The ULI Fields

The fields were chosen to be mindful of personally identifiable information and to be readily
available in the public domain, so that participants are not asked to share what is private in their
own systems.

| Name | `MemberFullName` · `MemberFirstName` · `MemberMiddleName` · `MemberLastName` · `MemberNickname` |
| License | `MemberStateLicense` · `MemberStateLicenseState` · `MemberStateLicenseType` |
| Association and MLS | `MemberNationalAssociationId` · `MemberMlsId` · `MemberType` |
| Office | `OfficeName` · `OfficeMlsId` |
| Provenance | `SourceSystemID` · `SourceSystemName` · `OriginatingSystemID` · `OriginatingSystemName` |

All seventeen are RESO Data Dictionary fields on the Member Resource, so none requires new
modeling. Having them is a different question: §2.3 records adoption as uneven, "from
near-universal names and identifiers down to a rarely broken-out license state and type," and
`MemberStateLicenseType` is defined from Data Dictionary 2.0, so a server certified against 1.7 does
not carry it at all.

## How It Works

In short: a participant asks the network whether anyone already holds a licensee, every participant
answers from its own data, and the answer decides whether an identifier is created or an existing
one adopted.

Three properties are worth knowing without reading the specification.

**The network itself stores nothing about licensees.** A participant searches its own data and answers for itself. The
question travels across the network; the licensee data does not.

**Matching is evidence, not a guess.** Each identifier that agrees contributes according to how much
it narrows the field. A national association ID is nearly decisive, a license number with its state
is close, and a common surname narrows very little. Two strong identifiers are always required, and
one alone is never enough, which is what keeps a common name from matching half the state.

**Each identifier proves its own origin.** A ULI is signed by the organization that created it, and
any authorized party holding the identifier can confirm that signature without calling anyone. A
fabricated or mistyped ULI cannot pass as real.

**Read more:** the **[methodology](/methodology/)**, and the
**[ULI Resolution Protocol specification](https://github.com/RESOStandards/transport/pull/222)**,
which is RCP-54 on RESO Transport.

## The Approach, and Why

The MLS landscape is decentralized by nature. Hundreds of organizations interoperate, and they do it
through data and API standards that let each market look broadly the same without a central system
existing.

The ULI follows that shape. It is built on the RESO Data Dictionary and Web API standards already in
place, and resolution runs as a conversation between participants rather than through a hub.

A shared pool of licensee data is the obvious alternative, and it is not what the protocol does.
The specification states the reason: resolving by consensus over replies rather than through a
central pool "makes the network adoptable among competitors even though the ULI fields are neutral
and widely available," so the protocol works "without anyone surrendering control of their data or
trusting a shared repository." The constraint is organizational rather than technical. The
participants who would populate such a pool compete with one another.

## Playground

A **[browser playground](/playground/)** runs the matcher on sample data, or on an imported roster.
Nothing loaded into the page leaves the browser, and the page has no means of sending it
anywhere.

## The Pilot

An earlier pilot ran the approach against real licensee data and has since been taken down. RESO is
rebuilding it on the protocol as specified, so that what the pilot measures is the thing the
specification describes. The goal is unchanged: test the approach against real data, measure how
well it works and publish what it finds.

Please **[contact RESO](mailto:dev@reso.org)** if you would like to take part.
