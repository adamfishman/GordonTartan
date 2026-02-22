# GordonTartan

A fork of [Tartanify.com](https://tartanify.com) — a collection of over 5,000 tartan patterns available to browse, explore, and download.

## Acknowledgements

This project is based on the original work of **[PeHaa](https://pehaa.com)** (Paulina Hetman) and **[Joe Vains](https://twitter.com/joevains)** (Sylvain Guizard). The original [Tartanify.com](https://tartanify.com) was conceived during a trip to Scotland, with the goal of making the vast wealth of tartan patterns freely accessible on the web. All credit for the original design, development, and data sourcing goes to them.

- Original repository: [github.com/pehaa/tartanify](https://github.com/pehaa/tartanify)
- Tartan data sourced from the [Scottish Register of Tartans](https://www.tartanregister.gov.uk/index)

## Current Functionality

- **Browse 5,000+ tartans** — explore the full collection via an A–Z alphabetical index
- **Individual tartan pages** — each tartan has a dedicated page showing its pattern, color palette, and threadcount, with a link to its official entry in the Scottish Register of Tartans
- **SVG download** — download any tartan as a seamless, repeating SVG tile
- **PNG download** — download any tartan as a PNG image
- **Search** — find tartans by name using the built-in search widget
- **Previous / next navigation** — step through the collection from any individual tartan page

## Tech Stack

Built with [Gatsby.js](https://gatsbyjs.org). Tartan pattern data is stored in a CSV file and transformed at build time. Patterns are rendered programmatically as SVG.

## Getting Started

```bash
yarn install
yarn dev
```
