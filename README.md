# Kubernetes security diagram (cheatsheet)

## What's this?

This is a diagram made to better understand and get an overview of kubernetes security.
It's not complete (but you are welcome to submitt a PR/issue), nor is it perfect, it is biased and it might not be for you.

It might however help you to discuss kubernetes in a security-context with your team, or just to get a better understanding yourself.

The drawing is most likely an overkill. It is not ment as a "solution" or design.
It's also quite busy, with a ton of elements. It's not ment to "explain" everything, but something you can sit down with and browse around and maybe learn something new.
Also, it is on-prem... For non on-prem, it might not be that relevant.

> [!NOTE]
> **How AI is used in this project**
> AI is used as a development aid, not as an author of the entire project. The diagram itself is 100% human-made, and much of the explanatory content is written by humans. The interactive interface was generated with AI assistance under close human supervision, with final decisions and quality control performed by a human.

## Where does it come from?

It is made for the purpose stated above inside Telenor Norway. It doesn't reflect any internal designs, architecture or even pattern. The diagram was made for discussion, but ended up being a good cheatsheet in general. So it's released so other companies or people might use it as well.

## Editing the diagram

The diagram is `kubesec-diagram.drawio.svg`: open it in draw.io (the `.drawio.svg` name tells draw.io and its VS Code extension it is editable). Cell metadata: [METADATA.md](METADATA.md).

`kubesec-diagram.svg` is rendered from it and committed by CI on every push: the traffic bands drawn in and draw.io's model removed, so it shows everything in any viewer and is half the size. It no longer opens in draw.io; do not edit it.

```sh
npm run dev       # uses the draw.io source; edits show on reload
npm run render    # kubesec-diagram.svg locally (needs: npx playwright install chromium)
npm run validate  # metadata of the source
```

## Changelog

* v2026.09.6
  * Fixing overlay egress traffic so it goes via the overlay CNI, not "magically" out
  * Moving things around, doing some cleanup of unneeded things and general improvements
* v2026.09.5
  * Rebuilt on [diagram-webkit](https://github.com/diagram-webkit/diagram-webkit)
    * Took the entire rendering engine used by kubesec-diagram and put into it's own project
    * kubesec-diagram now depends on that instead, containing only the data, not the engine
    * Changelog on this project can be much cleaner now, focusing on the diagram, not functionality
  * Many usability fixes, general cleanup, and a lot of bugfixes
  * Fix XSS possible when sharing links with user annotations
  * Elements can be highlighted
  * Lot more.. :)
* v2026.09.4
  * Total redesign and remapping of tags, levels and slugs. Big cleanup
  * Many fixes how tags are represented
  * Many minor improvements and fixes on visuals, layout and style
  * Adding some common logsources in drawing
  * More details about container images
  * Adding node-context box with info about hubble, runtime security, ...
  * More boxes that sends to logging
  * Hotkeys, info box that shows if entering site without url parameter
  * Better pinning visuals
  * Arrows annotations
  * ? mark menu that contains hotkeys and some url info
* v2026.09.3
  * Cleanup service-owner and operator access
  * Minor cleanups on the left side of the diagram
  * Some info about image building
  * Some additional info-bokses
  * Cleanup about VirtualMachine
  * Adding non-cloudnative / traditional to the drawing
  * Adding some details and tweaking some visuals
* v2026.09.2
  * Better sharing of focus areas (zoom is in the url)
  * Fullscreen mode is enabled if zoomed out (also in url)
  * Better handling of zoom, you can now zoom out of bounds to see everything without clicking the fullscreen button.
  * Fixing a scrollbug on mobile
* v2026.09.1
  * Adding kubelet, scheduler, controller manager
  * Lots of additional ? marks with info
  * Moving things around making it general clearer, including removing the "both" direction network traffic over to both colors. Easier to see.
  * Lots of tag-fixes
  * Adding service=NodePort instead of two LoadBalancer
  * Adding some extra run-policies, volume definitions, and other minor stuff
  * Clearer separation of AppArmor, SELinux and seccomp
  * Moving egress from policies to after network-policy filters.
  * EDR > CNAPP. Made more sense
  * Rounded lines, small tweaks to not bend so many line
  * Typos
  * Moving over to using https://calver.org instead of normal version numbers. The format will be YYYY.0M.MICRO
  * Misc typos
  * Misc cleanups and clearifications
* v11 (2026-03-04)
  * Adding levels
  * Minor fixes and tweaks
* v10 (2026-02-22)
  * Added gateway-api as an alternative to ingress
  * More info about properties of a Namespace
  * Moved over from using .png exports from draw.io to using .svg, this is a huge win!
    * All help text and points is now embedded inside the diagram itself. Much easier to edit
    * Opening up for new possibilities, more of them below in this releasnote.
    * Easier to save and create new objects, change tags, create new tags and so on.
  * Menu that contains filter and some buttons
  * Dark theme
  * A way to filter
    * By tags, both priorities and other dags (more to come, can be used to hide elements in the diagram as well)
    * Search
    * Hover over an item to see where in the diagram it is
    * State is saved as url params making menu queries searchable
  * A way to pin items so it is easier to share those you want to focus on
  * Lots of lots of bug fixes
  * Splitting up all javascript into smaller files to make it easier to manage, change and maybe later create a draw.io view library out of it..
  * There are many more small things. You should try clicking around as it is new. There are a lot of things under the hood that is fixed.
* v9 (2025-08-12)
  * Added drawing how RBAC, role-bindings and so on works. Many new circles with info.
  * Info about priority and fairness (rate limiting) in api
  * Adding info abuot PSA in "Validating and Mutating Admission Control"
  * Better info about ABAC and it's status
  * More presice description in "The Container Process"
* v8 (2025-07-07)
  * Splitting code up from one big file to multiple separate.
  * Adding functionality for user annotation that is saved in the url so it can be shared
* v7 (2025-06-30)
  * More writings in "The Container Process"
  * Warning and info if javascript is diabled
  * ?debug now loads image from ./
  * Duplicated namespaces defined, changed uid/gid into "user", and added UTS instead. Thanks ruatag! Fixes #2
* v6 (2025-05-11)
  * Removed all circles and made an interactive webpage instead, this makes it easier
    * To update the text via source
    * Text can be expanded without moving all the texts after
    * Cleaner diagram
    * Not having to worry about numbering anymore
    * Easier to copy from it and have links or other simple html elements
    * Created boundaries corners on upper left and buttom right so coords in % is static when editing the diagram. Never move things outside them.
  * Replaced number-references in old changelogs to text (since numbering is shuffled/cleaned)
  * Moving things around making the diagram wider to fit better on screen now that it's interactive
  * Making the whole diagram wider, making room for new stuff and easier to fit on a normal screen
  * Went trough all text and used AI to make it more clear, away with typos and less confusion.
  * RBAC > RBAC/ABAC and some info about it
  * Info about the dangerous "system:masters" group
  * Added more different container types and info about them.
  * Added information about audit-logging
  * Moving network interface boxes outside of "container" and under "pod" where they really belong
  * Moved repo from https://github.com/lars-solberg/kubesec-diagram to https://github.com/kubesec-diagram/kubesec-diagram.github.io and diagram at https://kubesec-diagram.github.io
* v5 (2025-05-02)
  * Operator vs service owner mixup fix
  * Making it clearer where RBAC is in the API
  * Separating network interfaces in overlay and underlay making it more clear how they differ
* v4 (2025-03-10)
  * Putting some items inside groups with additional information
  * Updating some descriptions
  * Better separation of namespaced vs cluster resources. More namespace info added as "Namespaces" and "Namespaced vs global resources"
  * Clearifications in "The container process" about where policies can be defined
  * Adding some example traffic flows, ingress and egress. Made traffic flow more intuitive
  * Clearification note on Deployment object. It's the same as the single-object Deployments in the drawing
* v3 (2025-01-10)
  * More typo and visual fixes
  * Adding "Kubernetes distro os'es" about kubernetes distroes
  * Adding about "Service portal"
  * Replacing "Crossplane" box with more generic info.
* v2 (2025-01-07)
  * Some clearifications and typo fixes
  * Adding info about "Network interfaces"
  * Adding focus priorites colors
* v1 (2024-12-17): Released to the public

## How to contribute

* Create an issue if something is wrong or you want to change something
* Alternative, do the change and submit a PR :)

## Interactive diagram 🔍

Take a look at [kubesec-diagram.github.io](https://kubesec-diagram.github.io)

## Supported URL parameters

The interactive page supports these query parameters:

* `v`
  * View: `cx,cy,w,h` (0-1 of the diagram) or `fit`. Written once you move the diagram.
* `debug`
  * Turns on some debug logs in some cases (duplicate/missing `data-slug`).
* `annotations`
  * Base64-encoded user annotations payload used for sharing annotation state.
* `menu`
  * `menu=true|false` controls filter panel visibility.
* `filter-query`
  * Restores filter search query.
* `filter-hide-tags`
  * Comma-separated list of hidden tags.
* `only-tags`
  * Comma-separated list of tags to keep; every other topic tag is hidden (ancestors and descendants stay).
* `filter-level`
  * Detail level, left out at the maximum.
* `tags`
  * `tags=open` expands the tag tree.
* `pins`
  * Comma-separated list of pinned annotation slugs (`data-slug` on SVG elements).
* `highlight`
  * Comma-separated slugs to highlight; `tag:<tag>`, `id:<cell-id>` and `mode:outline|pulse|dim-others` are also accepted.

## Development

The page is built with [diagram-webkit](https://github.com/diagram-webkit/diagram-webkit); this repository holds the diagram and its data only.

```sh
npm install
npm run dev        # local server
npm run build      # static site in dist/
npm run validate   # slugs, tag ancestors and views against the SVG
npm run generate   # config/tag-descriptions.generated.js from METADATA.md (dev/build do this too)
npm run check      # data only (no DOM code) + validate
npx playwright install chromium
npm run test:parity   # old links give the same view as the site before diagram-webkit (v2026.09.4)
```

Releases: add a new entry at the top of the Changelog above (`* vYYYY.MM.N` with its bullet points) and push to `main`. `.github/workflows/release.yml` sees the new version, then checks, builds and creates the tag `vYYYY.MM.N` and a GitHub release with those bullet points. Not on npm: decks depend on the tag (`github:kubesec-diagram/kubesec-diagram.github.io#vYYYY.MM.N`). The version on the site comes from the same entry (`config/version.generated.js`, written by `npm run dev` / `build`).

Local development uses the diagram-webkit checkout at `~/base/diagram-webkit/repo` when it exists (`.envrc`, direnv; `direnv allow` once). Engine edits then hot-reload, and `npm run dev` prints `diagram-webkit: local engine …`. Another checkout: `export DIAGRAM_WEBKIT_DIR=<path>`; the installed package for one command: `DIAGRAM_WEBKIT_DIR= npm run dev`. CI has no direnv; it builds with the latest diagram-webkit on npm (`npm run engine:latest`), and the site redeploys daily so new engine versions go live without a push here.
