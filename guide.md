---
title: Guide
permalink: /guide/
description: Try the playground, run a node, load a roster, resolve your own duplicates, then join the network and resolve a licensee, task by task.
---
<!-- Copied by script from the guide draft of 2026-10-12. Removed: the draft banner and the author's working notes at the end, which were not
     content. Changed:
     the playground link repointed to /playground/; one heading's "With" lowercased per the
     Title Case rule. Import formats are as the draft states them: the playground reads CSV
     and XLSX, the node command line reads CSV. -->
# ULI Guide

The Unique Licensee Identifier gives each licensed real estate professional one stable identifier,
carried alongside the identifiers your systems already use. It links a licensee's records across
markets and products without merging them, so each record keeps its own identity and its own local
ID while also saying which person it belongs to.

Nothing is centralized. You search your own data and answer for yourself, you share only the fields
you choose with the participants you choose, and the network stores no licensee data at all.

## Try It Before You Set Anything Up

Open the **[playground](/playground/)**. It runs the real matcher in your browser on sample data,
and you can import your own roster as CSV or XLSX.

Nothing you load leaves your browser. The page carries no code that could send it anywhere and a
content-security policy that refuses outbound connections even if it did, which you can read in view
source. Your data stays in that browser's local storage until you clear it, and the Clear control
shows you what it holds before it wipes it.

This is worth doing first. The matcher is the same engine the network runs, so running it over your
own roster tells you what the network would find, before you have talked to anybody.

> On a shared or managed machine, clear your browser when you are finished. Local storage survives a
> restart and belongs to whoever next uses that profile.

## Getting Started

### Run a Node Locally

Credentials belong in a file, never in a chat.

Create a `.env` file next to the node. Every one of these has a working default, so the shortest
version is an empty file:

```
OPENSEARCH_URL=http://localhost:9200
PORT=3000
ULI_ORIGIN=http://localhost:3000
ULI_NODE_UOI=M00000123
ULI_NODE_TOKENS=<comma-separated bearer tokens that may read payloads>
ULI_SIGNING_KEYS={"M00000123":"<pkcs8 pem>"}
```

`ULI_NODE_UOI` is the organization the node acts for, and defaults to the first one it finds in the
index. `ULI_NODE_TOKENS` generates a default if you leave it out. `ULI_SIGNING_KEYS` is a map from
organization identifier to private key: leave it out and the node generates a fresh key on every
start and prints it, which is fine for a first look and means the identifiers you mint stop
verifying after a restart. Paste the printed value back into the file to keep a stable identity.

Bring up the search backend, then the node:

```
docker compose -f docker-compose.opensearch.yml up -d
npm install && npm run build
node dist/bin/serve.js
```

The node answers on `http://localhost:3000/uli-service/v1`. Start the dashboard with `npm run dev`
in the client and open `http://localhost:5173`.

> One thing to know about the local node, because it looks like magic otherwise. It registers
> **every organization it finds in the index** as a resolver, each with its own signing key, on an
> in-process governance feed. So a broadcast from one of your tenants is genuinely answered by the
> others and the identifier it mints genuinely verifies. The protocol is real; the network is your
> own machine.

### Load Your Roster

Two ways in.

**A file.** CSV in the canonical ULI format, which is the seventeen Data Dictionary Member
fields. Column headers are the field names. The file is the first argument:

```
node dist/bin/ingest-csv.js roster.csv --uoi M00000123
```

`--usi` records the system it came from, `--dd` sets the Data Dictionary version (2.1 by default) and
`--url` points at a different OpenSearch.

**Your Web API.** If you serve a certified Web API, the node reads `Member` directly through the
RESO Client SDK, so there is no export step:

```
node dist/bin/ingest-webapi.js --uoi M00000123
```

The source comes from **the same environment variables the Client SDK and RESO certification
already use**, so if you have run either, this is already configured:

```
RESO_BASE_URL=https://your-server.example.com
RESO_AUTH_TOKEN=your-token
```

or the client-credentials set in place of the token. Add `--expand-office` if you want the Office
expansion; it is off by default, because `OfficeName` and `OfficeMlsId` are already on Member and
only an office address would need it.

Re-running either is safe. Records carry a deterministic key, so a second ingest updates rather than
duplicates.

## Resolve Your Own Duplicates First

Before the network is involved at all, run the matcher over your own data. This is not a warm-up
exercise. It is the protocol's own first case: the same engine runs locally for your private
deduplication and on the network for everyone else's.

The dashboard opens on what needs resolving internally. Each pair shows its score broken down by
factor, so you can see *why* the matcher thinks two records are one person rather than being handed
a number.

For each pair you decide **same person** or **different people**. Same person links the records
locally. Different people records that too, which matters: the matcher does not ask you again, and
your decision becomes evidence for tuning the weights later.

Many participants stop here for a while, deliberately. Local matching needs no network, no agreement
with anyone and no disclosure.

## Join the Network

Certification first. RESO verifies your node in a sandbox, where you grant access to your data for
the certification phase only, and that access ends at the production boundary.

The gate checks four things: that you are who you say you are, that you speak the protocol
correctly, that your matcher reproduces the reference scores **exactly**, and that your search finds
what it should. The scoring bar is exact rather than approximate, because a score only means
something across the network if every node computes the same one.

Once certified you appear in RESO's published resolver list with your organization identifier, your
system identifier, your public key, your status and a **hash** of your node address. Every other
resolver follows that list, which is how a broadcast reaches you without anyone arranging it.

Your node address itself is never published. The feed is public, so it carries only the hash, and
the address is exchanged later between you and each resolver along with the tokens. The hash is what
makes that exchange safe: a node hashes the address it was handed and compares it to the certified
hash, which confirms it reached the resolver RESO certified without the registry ever exposing where
anyone's node lives.

### Authorize the Resolvers You Rely On

One piece of setup that is easy to miss and will otherwise look like a bug.

A resolver cannot match a licensee it cannot read. When you broadcast, the licensee details sit
behind a protected link, and only the resolvers you have authorized can open it. So authorize enough
of them that a decision can actually be reached, which means your mandatory resolvers plus enough
others to reach consensus.

Authorizing the whole network is simpler and is what we recommend. You are still sharing only the
subset of fields you chose, still only on the licensees you broadcast, and a resolver still sees
nothing about anyone you do not ask about.

## Resolve a New Licensee

Your membership staff enter a new licensee. Before anything is shared, the record has to be specific
enough to be worth asking about: **two strong identifiers**. An association ID and a name. A license
number with its state, and a name. One alone is never enough, which is the rule that keeps a common
name from matching half the state.

Press Resolve on the network. Three things then happen without you doing anything.

**Your question reaches every resolver.** One message, addressed to the resolver list that all of
them follow.

**They answer.** Each searches its own data and replies with a match or no match. A reply of *no
match* counts, and that is the part worth knowing: it is what lets a decision be reached at all, and
it distinguishes a resolver that looked and found nothing from one that never looked.

**The thread shows the tally as it fills.** How many replies have arrived, how many are needed, and
which of your mandatory resolvers have not answered yet.

When enough have answered, you get one of two outcomes.

**Nobody has her.** You create a new identifier, and only now, never before. A new identifier is a
claim that this person is not already on the network, and only the network can establish that.

**Someone has her.** You adopt their identifier. Nothing is created, nothing is posted to the thread
and the other participant's records are untouched. Both of you now point at the same person.

Adoption being silent is deliberate and surprises people. A participant posts to the thread only
when shared state changes, and adopting an existing identifier changes nothing shared.

## When You Disagree with a Match

A match comes back and it is wrong. A junior and a senior at the same brokerage. Two people with the
same common name in the same state.

You do not reject it. You rebroadcast with corrected criteria in the same thread, and the network
decides again. The correction is the signal, because the resolvers who would confirm a match need to
see what was actually wrong, not that you said no.

If the corrected round finds nobody, you mint. If it surfaces the right identifier, you adopt that
one. A wrong match that you caught is a clean separation, not a merge: the identifier you were
wrongly matched to is untouched.

## When Two Identifiers Turn Out to Be One Person

It happens. Two participants resolved the same licensee independently before either saw the other.

**Neither identifier survives**, and this is the part that surprises people. The two are not
collapsed by picking a winner. Both are excluded from matching, the merged details are resolved on
the network as an ordinary question, and the answer becomes the target: a fresh identifier if nobody
else holds the person, or the existing one if somebody does. Then both originals retire into that
target.

The reason is mechanical, not a matter of fairness. Both holders' own records carry the merged
details, so leaving them in the match would guarantee that they matched it, and there would be no
way to tell whether anyone else holds the person. Excluding them is what makes the question
answerable.

Neither retired identifier is deleted. Each keeps pointing at the target, so anything downstream that
recorded either one still resolves to the right person, and your records relink to the target.

## When a Better Match Turns Up Late

A different situation that looks similar. A resolver that was slow or briefly offline surfaces a
match after an identifier was already created.

That is not a merge. Here one identifier does retire into the other, and the test is **which match
is stronger**, not which identifier is older. A higher score wins, and the identifier that was just
minted is usually the one retired.

This needs no new round of agreement, and the reason is worth knowing. Creating an identifier rests
on an *absence* of matches, and only the network's replies can establish an absence. A better match
is the opposite: a present fact, whose score any participant can recompute from the same published
details. So a holder can retire its identifier and redirect it as soon as it acknowledges the better
match. A holder that is offline neither blocks the redirect nor has to ratify it later, and on return
it simply follows the redirect.

That is why resolution is eventually consistent rather than final on the first pass.

## Check That an Identifier Is Real

Paste any ULI into the verifier.

Each one carries a signature from the organization that created it, so you can confirm it came from
a certified participant without calling anyone and without a lookup. A fabricated or mistyped
identifier fails immediately.

What this proves is narrow and worth being precise about: a certified organization created this
identifier. It does not prove the match behind it was correct, and it says nothing about the
licensee.

## For the Technically Curious

### Three Layers, Three Different Standards

**Search** finds candidates in your own data. How you do it is your business, and certification
measures it on recall and precision.

**Scoring** decides how strong the evidence is. This must reproduce the reference implementation
exactly, on every published test vector, because a score that means different things at different
nodes means nothing.

**Resolution** is the conversation: broadcast, reply, consensus, create or adopt. Certification
checks conformance to the protocol.

The distinction between the first two is the one worth internalizing. Search relevance depends on
what else is in your index, so two participants with different rosters compute different relevance
for the same pair of records. That is why relevance ranks candidates and never crosses the wire as a
score.

### Scoring

Each identifier that agrees contributes according to how much it narrows the field, and the
contributions add up. Primary identifiers are weighted an order of magnitude above secondary ones,
so secondary evidence can refine a decision between candidates but can never substitute for a second
primary identifier.

Correlated identifiers are counted once. Office ID and office name are two views of one fact, so
the strongest one that matched scores and they are never summed.

The weights and the threshold are published, identical for everyone, and treated as settings of the
network rather than choices each participant makes. You may tune them in your own sandbox, and the
playground lets you do exactly that: move a weight and watch which candidates cross the line.

> The current weights are illustrative. They are the right ordering, and the real values will be
> fitted against pilot data.

### Transport

Resolution runs over ActivityPub, using only standard Activity Streams vocabulary with no
extensions. An activity carries who acted, what it answers and when. Licensee records never travel
in it: they sit behind an authenticated link in RESO Common Format.

Your node is three pieces. A matching service holding the scorer and the search, a light
ActivityPub server for the inbox and outbox, and a data source for the ULI fields, which can be your
own certified Web API.

### What the Specification Settles, and Where

The **[ULI Resolution Protocol](https://github.com/RESOStandards/transport/pull/222)** is RCP-54 on
RESO Transport. Field definitions and the payload are in Section 2.3, the broadcast rules in 2.4,
replies in 2.5, consensus in 2.6, the lifecycle in 2.7, signing in 2.8, scoring in 2.9, the resolver
list in 2.10, authentication in 2.11 and worked examples in 2.12. Certification is Section 3.

## Taking Part

An earlier pilot ran against real licensee data and has been taken down. RESO is rebuilding it on
the protocol as specified.

Please **[contact RESO](mailto:dev@reso.org)** if you would like to take part.
