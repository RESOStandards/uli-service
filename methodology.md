---
title: Methodology
permalink: /methodology/
description: How a licensee is resolved to a ULI, step by step, with the protocol detail for implementers.
---
<!-- Copied by script from the methodology draft of 2026-10-12. Removed: the draft banner.
     Changed: the "Diagram needed" note became the resolution diagram; the layers and access
     diagrams and one playground link were added at the places marked GUESS below; the
     outcomes table's empty placeholder header row dropped so it renders without a header. -->
# How the ULI Works

## The Problem, in One Case

An agent is licensed in Indiana and works listings in two neighboring MLSs. Each one gave her an
account. One has her as Jennifer, the other as Jenny. Her brokerage changed hands last year, so the
office name differs too.

She is one person. To every system that touches her, she is two agents, or three. Her production
splits across the records. A data share carries both. A broker back office cannot reconcile them.
Her forms provider, her lockbox and her CMA tool each hold a different version of her.

Nobody did anything wrong. There is simply no identifier that says *these are the same licensee*,
so every system invents its own and none of them agree.

The Unique Licensee Identifier is that missing identifier. One stable ID per licensed
professional, carried alongside the IDs everyone already has rather than replacing them.

## What a ULI Does Not Do

It does not merge anyone's records. This is the part that surprises people, so it is worth saying
early.

MLSs duplicate licensee records deliberately, to grant the access a licensee actually needs. Those
duplicates are not a defect to be cleaned up; they are how the system works. A ULI **links** them.
Each record keeps its own identity and its own local ID, and each also carries the ULI that says
which human it belongs to.

So nothing is flattened and nothing is taken away. A system that wants to roll up a licensee's
production can now do it. A system that does not care can ignore the field.

## The Lifecycle

### An Organization Joins

A participant loads its licensee data and runs the matcher against **itself** first. Internal
duplicates surface before anything is shared, which is both useful on its own and the honest place
to start: an organization sees what the matcher thinks about data it already knows well.

Many participants stop here for a while, deliberately. Local matching needs no network, no
agreement with anyone and no disclosure.

<!-- GUESS: the brief asks for the playground to be linked from this page; the draft had
     no link. Placement and wording are mine; the claims are the white paper's. -->
A **[browser playground](/playground/)** runs this local matching on sample data, or on a
roster you import yourself, and nothing you load leaves your browser.

<!-- The resolution diagram sits where the draft's 'Diagram needed' note was. -->
{% include diagrams/resolution.svg %}

### A New Licensee Arrives

Membership staff enter a new licensee. Before the record is shared with anyone, it has to be
specific enough to be worth asking about: **at least two strong identifiers**. A national
association ID and a name. A license number and state, and a name. One alone is not enough, which
is the rule that keeps a common name from matching half the state.

### The Network Is Asked

The participant asks every other certified participant: *do you already have this person?*

This is where the design differs from what people expect. There is no central registry holding
everyone's licensees. Each participant searches **its own data** and answers for itself. The
question travels; the data does not. What a participant shares, it shares with the parties it has
authorized, over an authenticated connection, and only after the question has been asked.

Each one replies, and **a reply of "no match" counts.** That is not a formality. It is what lets
the group reach an answer at all, and it is the difference between a participant that looked and
found nothing and a participant that never looked.

### Someone Has Her, or Nobody Does

**Nobody does.** Once enough participants have answered, the asking organization creates a new
ULI. Not before – a new identifier is a claim that this person is not already on the network, and
only the network can establish that.

**Someone does.** The asking organization adopts the existing ULI. Nothing is created, nothing is
announced, and the other participant's record is untouched. Both now point at the same person.

**Someone has her twice.** Two ULIs that turn out to be one licensee are reconciled, and **neither
of the two survives**: both are excluded from matching, the merged details resolve on the network,
and both originals retire into whatever that resolution returns (§2.7, §2.12.4). Each retired
identifier keeps pointing at the target rather than disappearing, so anything that recorded either
one still resolves. A *single* identifier does retire into another in the late-match correction of
§2.12.3, which is a different case: there the test is a better match, a higher score, not a merge.

## How the Network Decides

Matching is a question of evidence, and different identifiers carry very different amounts of it.

A national association ID is nearly decisive. A license number with its state is close. A full
name narrows things considerably, until the name is Smith. An office name barely narrows anything
on its own, but it is useful for telling two candidates apart.

So each matched identifier contributes according to how much it narrows the field, and the
contributions add up to a score. The score is a threshold, not a probability – it says *there is
enough here*, not *this is 87 percent likely*. Three outcomes:

| **Not a match** | too little in common to be worth anyone's time |
| **Needs review** | something real, not enough to act on. A person looks |
| **Possible match** | enough evidence to take to the network |

Two rules shape the scale, and both exist to stop a plausible-looking wrong answer:

**One strong identifier never clears the bar on its own.** That is the specification's rule, and it
is the one that matters: §2.4 states that identifiability "in practice requires at least two primary
identifiers, since a single primary identifier cannot reach the threshold alone."

The converse does **not** hold under the published numbers, and the gap is a known defect rather
than a subtlety. At the specification's threshold of 1300, Full Nickname at 650 plus License Number
and State at 600 reaches only 1250, so two genuinely strong identifiers fall short. RESO has
identified the threshold as the error and not the weights: 1250 is the sum of the two smallest
identifiers that can co-match, which is the floor two primaries should clear by construction. The
correction is proposed, not yet adopted.

**Weak evidence cannot add up to strong evidence.** An office, a shared surname and a matching
middle initial can refine a decision between two candidates. No amount of it substitutes for a
second strong identifier.

The weights and the threshold are published, identical for everyone, and treated as settings of
the network rather than choices each participant makes. That is what makes one participant's score
mean the same thing as another's.

> **Current status, and what is proposed rather than adopted.** The specification publishes a weight
> set and a threshold of 1300, and makes both network parameters that RESO sets and may change
> independently (§2.9). Everything in this paragraph beyond that is RESO's current thinking and is
> **not** in the specification: that the published weights are illustrative, carrying the right
> shape and ordering while the values are fitted against pilot data; and that the threshold is
> better derived from the weight set than chosen for it, so that it stays correct as the weights
> change. Under that derivation the threshold is 1250 rather than 1300. The specification's §6
> describes a different plan, a count-based scale over a versioned frequency table.

## What Makes a ULI Trustworthy

A ULI carries its own proof. Each one is signed by the organization that created it, and anyone
holding the identifier can check that signature offline, against that organization's published
key, with no lookup and no call back to anybody.

What this proves is narrow and worth stating precisely: a certified organization created this
identifier. It does not prove the match was right, and it says nothing about the licensee. It
means a fabricated or mistyped ULI cannot pass as real, which is the property that matters when an
identifier travels far from where it was made.

---

## For Implementers

Everything above is specified in the **ULI Resolution Protocol**, RCP-54. Section references are
to that document.

The protocol is built from a small set of actions and two gates.

**Actions.** Broadcast a resolution request. Reply, with a match or a no-match. Mint a new
identifier. Adopt an existing one. Supersede one with another. There is deliberately no "decline":
declining a proposed match is a rebroadcast with corrected criteria, because the participants who
would confirm it need the correction, not a rejection (§2.7).

**Gates.** The **identifiability gate** keeps under-identified records off the network: a record
must score highly enough that a full match could reach the threshold, which in practice means two
primary identifiers (§2.4). The **consensus gate** governs creation: `floor(2/3 × R)` of the
certified resolver pool must have replied, and every resolver the originator named as mandatory
must have answered (§2.6).

**Adoption is silent.** Adopting an existing ULI posts nothing to the thread. A participant posts
an outcome only when it changes shared state – creating, superseding, reconciling. This is
counter-intuitive and it is deliberate (§2.7).

**Transport.** Resolution runs over ActivityPub using only standard Activity Streams 2.0
vocabulary, with no extensions (§2.2). An activity carries who acted and what it answers. Licensee
records never ride in it: they sit behind an authenticated link in RESO Common Format (§2.1,
§2.11).

**Matching has two layers, and they are held to different standards.** A participant's search over
its own data is measured on recall and precision, and how it searches is its own business. The
**score** must reproduce the reference implementation exactly, on every published test vector
(§3.1). Search finds candidates; scoring decides. Conflating them produces a number that cannot
mean the same thing to two participants, because search relevance depends on what else is in the
index.

<!-- GUESS: placement of the layers diagram, after the paragraph it illustrates. -->
{% include diagrams/layers.svg %}

**Certification is continuous.** A participant proves conformance in a sandbox before joining, and
is then monitored rather than periodically recertified: the daily liveness check samples recent
threads and verifies the participant behaved correctly (§3.2).

**Membership is public, resolution is not.** A public, PII-free feed carries who is certified and
what the network's parameters are. The resolution conversations stay between authenticated
participants (§2.10).

<!-- GUESS: placement of the access diagram, after the paragraph it illustrates. -->
{% include diagrams/access.svg %}
