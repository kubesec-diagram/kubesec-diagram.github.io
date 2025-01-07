# Kubernetes security diagram (cheatsheet)

## What's this?

This is a digram made to better understand and get an overview of kubernetes security.
It's not complete (but you are welcome to submitt a PR), nor is it perfect, it is biased and it might not be for you.

It might however help you to discuss kubernetes in a security-context with your team, or just to get a better understanding yourself.

The drawing is most likely an overkill. It is not ment as a "solution" or design.
Also, it is on-prem... For non on-prem, it might not be that relevant.

## Where does it come from?

It is made for the purpose stated above inside Telenor Norway. It doesn't reflect any internal designs, architecture or even pattern. The diagram was made for discussion, but ended up being a good cheatsheet in general. So it's released so other companies or people might use it as well.

## Changelog

* v1 (2024-12-17): Released to the public
* v2 (2025-01-07)
  * Some clearifications and typo fixes
  * Adding info about network interfaces (28 and 29)
  * Adding focus priorites colors

## How to contribute

* Create issues with fixes, improvements and suggestions.
* Create pull-requests on the drawio file with details about the changes you did.
* To generate a new export using draw-io, use
  * export-as > png
  * border width: 15px
  * uncheck all options

## Diagram

![kubesec-diagram](https://github.com/lars-solberg/kubesec-diagram/blob/main/kubesec-diagram.png?raw=true)
