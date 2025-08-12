# Kubernetes security diagram (cheatsheet)

## What's this?

This is a diagram made to better understand and get an overview of kubernetes security.
It's not complete (but you are welcome to submitt a PR/issue), nor is it perfect, it is biased and it might not be for you.

It might however help you to discuss kubernetes in a security-context with your team, or just to get a better understanding yourself.

The drawing is most likely an overkill. It is not ment as a "solution" or design.
It's also quite busy, with a ton of elements. It's not ment to "explain" everything, but something you can sit down with and browse around and maybe learn something new.
Also, it is on-prem... For non on-prem, it might not be that relevant.

## Where does it come from?

It is made for the purpose stated above inside Telenor Norway. It doesn't reflect any internal designs, architecture or even pattern. The diagram was made for discussion, but ended up being a good cheatsheet in general. So it's released so other companies or people might use it as well.

## Changelog

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

* Create issues with fixes, improvements and suggestions.
* Create pull-requests on the drawio file with details about the changes you did.
* To generate a new export using draw-io, use
  * export-as > png
  * border width: 0
  * uncheck all options
* Export as svg as well

## Interactive diagram 🔍

Take a look at [kubesec-diagram.github.io](https://kubesec-diagram.github.io)
