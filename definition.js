import { defineDiagram } from "diagram-webkit";
import annotations from "./config/annotations.js";
import descriptions from "./config/tag-descriptions.generated.js";
import { groups, meta } from "./config/tags.js";
import { camera, ui } from "./config/ui.js";
import about from "./content/about.js";
import css from "./content/css.js";
import footer from "./content/footer.js";
import page from "./content/page.js";
import views from "./views.js";

// kubesec-diagram.drawio.svg is the draw.io source; kubesec-diagram.svg is
// rendered from it (npm run render, and CI on push): line overlays drawn in,
// draw.io's model removed. The site loads the rendered one; the dev server
// (development mode) loads the source, so draw.io edits show on reload.
const rendered = new URL("./kubesec-diagram.svg", import.meta.url).href;
const source = new URL("./kubesec-diagram.drawio.svg", import.meta.url).href;

export default defineDiagram({
  id: "kubesec",
  requires: ">=0.1.1", // any newer engine; the deploy always builds with the latest
  source: { production: rendered, debug: rendered },
  tags: { groups, meta, descriptions },
  annotations,
  camera,
  ui,
  content: {
    page,
    about,
    license: "MIT",
    repository: "https://github.com/kubesec-diagram/kubesec-diagram.github.io",
    footer,
    css,
    texts: { diagramLabel: "Kubernetes security diagram", aboutTitle: "Kubernetes security diagram" },
    downloads: {
      drawio: { url: source, name: "kubesec-diagram.drawio.svg" },
      full: { url: rendered, name: "kubesec-diagram.svg" },
      view: { name: "kubesec-diagram-view.svg" },
    },
  },
  storage: { namespace: "kubesec" },
  features: { preset: "app", lineOverlays: false }, // the rendered SVG has the bands
  views,
  development: {
    source: { production: source, debug: source },
    features: { lineOverlays: true },
  },
});
