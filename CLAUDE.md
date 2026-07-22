# CLAUDE.md

Context for working in this repo that the code and git history do not show. Everything here is
something that has already cost someone a debugging session.

## What this is

The web application behind **vdjdb.com** — a curated database of T-cell receptor sequences with known
antigen specificity. Play 2.6 / Scala 2.12.8 backend, Angular 7 frontend, deployed as a single Docker
image.

Five user-facing areas: **Browse** (search the database), **Motif**, **Structure**, **Refsearch**, and
**Annotate** — an auth-gated pipeline where a user uploads a repertoire sample and it is matched against
VDJdb over a websocket.

The annotation engine is `com.github.antigenomics:vdjmatch:1.3.1`, resolved from **jitpack**, built from
the `legacy-java` branch of that repo (Groovy/JVM). The default branch there is an unrelated Python
rewrite — so "what language is VDJmatch" has two answers and neither belongs on the About page.

## Layout

| Path | What |
|---|---|
| `app/backend/` | Scala. `controllers/`, `models/`, `server/` (search, annotations, database, limit) |
| `app/frontend/src/app/` | Angular. `pages/<area>/`, `shared/`, `utils/` |
| `app/frontend/styles/` | Global CSS: `design-system.css` (owns the `--ds-*` tokens, loaded last), `semantic-extensions.css`, `main.css` |
| `app/frontend/views/` | Twirl — the app shell (`main.scala.html`, `index.scala.html`) and the account emails |
| `conf/` | `application.conf`, `routes`, `messages.en`, `logback.xml`, `evolutions/` |
| `test/` | ScalaTest specs |
| `public/` | Static assets served by Play |

## Build and test

`java` is **not on PATH**. Every command needs this first:

```zsh
export JAVA_HOME=$(/usr/libexec/java_home -v 1.8)   # Temurin 8, matches CI's Zulu 8
export PATH="$JAVA_HOME/bin:$PATH"

sbt compile test:compile test          # backend + specs
sbt frontendInstallDependencies build  # what CI runs; needs node 11 + yarn 1.x
```

CI (`.github/workflows/ci.yml`) is Zulu 8 / node 11 / yarn 1.22.19, and it runs `sbt test` — that was
added deliberately, because `build` is `packageBin` in Universal and never looks at `src/test`, so for a
long time nothing in CI compiled the specs, let alone ran them.

The specs boot a real Guice application. They only work offline because `test/resources/database/` holds
a small VDJdb fixture; without it, `BaseTestSpecWithApplication` downloads the whole database before the
first assertion. See `SOURCES.md`.

## Traps

**`-Xfatal-warnings` is on, but `-Ywarn-unused` is not.** `build.sbt` enables `-unchecked -deprecation
-Xfuture -Yno-adapted-args -Ywarn-dead-code -Ywarn-numeric-widen -feature`. So an unused import will
*not* fail the build, but a discarded non-Unit expression under `-Ywarn-dead-code` will. Do not assume
either way — compile.

**`Configuration.getOptional` is not null-safe.** It gates on `hasPathOrNull`, so a key explicitly set to
`null` reaches `getString` and throws `ConfigException.Null`. Use `conf.underlying.hasPath(path)`, which
is false for null.

**Production replaces `application.conf`, it does not merge it.** The container runs with
`-Dconfig.file=/home/vdjdb/environment/application.conf`, bind-mounted from
`~/vdjdb_publish/conf/prod/application.conf` on the server. Consequences, both of which have bitten:

- Any key you add here is **absent in production** until someone edits that file by hand. A fix can look
  shipped, pass CI, deploy cleanly, and do nothing.
- Any key read without a default crash-loops the app on deploy if it is missing there.

So: read new keys defensively, and when a change depends on a config value, say explicitly which keys
must be mirrored.

**`.jvmopts` never reaches the packaged app** — it is sbt-only. Production heap is `JAVA_OPTS=-Xmx6g`
in `docker-compose.yml`.

**The Angular production build collapses whitespace between adjacent inline tags.** `<b>A.</b> <b>B</b>`
renders as `A.B`. Use `&nbsp;` where the space matters.

**Semantic's `@teal` is overridden to the brand green `#48af75`** in `styles/semantic/src/site/globals/
site.variables`. So `ui teal button` renders green and *is* on-brand; residual `ui blue` / `ui orange` in
templates are the off-brand ones.

**Local sbt cannot reach Maven Central from this machine** (connection refused; `repo.scala-sbt.org`,
jitpack and the yarn registry are all fine). Bootstrap through a mirror:

```
[repositories]
  local
  maven-local
  central-gcs-mirror: https://maven-central.storage-download.googleapis.com/maven2/
  jitpack: https://jitpack.io/
  sonatype-releases: https://oss.sonatype.org/content/repositories/releases/
  typesafe-ivy-releases: https://repo.typesafe.com/typesafe/ivy-releases/, [organisation]/[module]/[revision]/[type]s/[artifact](-[classifier]).[ext], bootOnly
  sbt-plugin-releases: https://repo.scala-sbt.org/scalasbt/sbt-plugin-releases/, [organisation]/[module]/(scala_[scalaVersion]/)(sbt_[sbtVersion]/)[revision]/[type]s/[artifact](-[classifier]).[ext]
```

then `sbt -Dsbt.repository.config=<file> -Dsbt.override.build.repos=true …`. The `override` flag is
required to route everything through the mirror — but it also **suppresses the resolvers in
`build.sbt`**, which is why jitpack has to be listed explicitly or `vdjmatch` will not resolve.

**sbt output is ANSI-coloured.** `grep '^\[error\]'` matches nothing. Strip first:
`sed -E 's/\x1b\[[0-9;]*m//g'`.

## Deploy

`master` is branch-protected; land PRs with `gh pr merge --admin`.

```zsh
gh pr merge <n> --admin --squash --delete-branch
gh workflow run "Dev Docker Publish (manual)" --ref master     # publishes :dev
ssh vdjdb@100.83.178.73
cd ~/vdjdb_publish
docker compose pull vdjdb && docker compose up -d --force-recreate vdjdb
docker compose up -d --force-recreate traffic-logger           # NOT optional, see below
```

**Always recreate `traffic-logger` too.** It runs `network_mode: "container:vdjdb"`, so recreating the
app container destroys its network namespace. tshark does not exit when that happens, so
`restart: unless-stopped` never fires and `docker ps` keeps reporting `Up` while it captures nothing.

**`docker compose up -d` is a no-op when the image has not changed.** Config-only edits need
`--force-recreate` or you will verify a change that was never loaded.

## Domain conventions

IMGT gene names with the locus prefix (`TRBV20-1*01`), never bare. **CDR3 and junction are not the same
region** — junction includes the conserved Cys104 and Phe/Trp118 anchors, IMGT CDR3 excludes both, so
`junction_aa` is two residues longer. Conflating them corrupts matching silently. AIRR field names for
uploads (`v_call`, `j_call`, `junction_aa`, `cdr3_aa`). HLA at the data's own resolution
(`HLA-A*02:01`), always paired with its MHC class.

## Open loops

- **Retention is `dryRun = true` in production.** It logs what it would delete and removes nothing.
  `ageFrom = "2026-09-01T00:00:00Z"` is set and applies to **registered samples only** — temporary ones
  always age from their own timestamp, so a future floor cannot suspend the 3-hour token window. A dry
  run prints up to 20 per-sample lines per sweep; read one before flipping `dryRun`. On production 1,375
  of 1,443 registered samples are already outside the window, so switching it on without the floor is a
  near-total wipe, not housekeeping.
- **Mailjet.** The account was blocked upstream; a support ticket was filed. Once unblocked: rotate the
  API key, then set `VDJDB_MAILJET_EVENTS_TOKEN` in `.env` and register the Event API callback so the app
  can tell a delivered message from an accepted-then-dropped one (`MailjetEventsAPI`, currently disabled
  and returning 404 by design when the token is unset).
- **Deferred from the July 2026 audit**, each deliberately not bundled into a fix:
  - Unpaged Browse search materialises the whole result set on the request thread
    (`DatabaseAPI.scala`). Capping it is a behaviour change that could break existing API clients.
  - No component stylesheet uses a `--ds-*` token — ~200 colour literals across 25 files. A migration.
  - The structure pages carry a private blue/red/green palette, plus a 2px grid overflow at 375px.
    Belongs with the token migration.
  - Motif and structure queries run CPU-bound scans on the default execution context; they want a
    bounded dedicated pool like `AnnotationsScheduler` has.

- **The annotations websocket has no request timeout, anywhere.** `WebSocketConnection.sendMessage`
  resolves only on a matching inbound frame; `_messages` is never errored or completed on close. A
  request written to a socket that then dies never settles, and `subscribeMessages` (the annotate path)
  discards `send()`'s result entirely, so it cannot fail fast at all. Downstream, every latch is set
  before an un-timeout-ed await and cleared only on success or an explicit error frame — so a dropped
  socket leaves a sample permanently "processing" and further attempts are refused with `Sample is
  already being annotated`. Both route resolvers (`user.resolver.ts`, `sample.resolver.ts`) wrap a
  `Promise` with no reject path, so if `INITIALIZED` never fires, every route under `/annotations`
  blocks forever. As of #189 the user at least gets told the connection died; the hang itself is
  untouched. Reconnect has its own bugs: `send()` resolves as soon as a new `WebSocket` is constructed
  rather than opened, and it overwrites `_onOpenCallback`, destroying the service's init closure.
