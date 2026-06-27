package workspaced

// Documentation packs: single source of truth for vendoring + site metadata.
// Placed under content/<destination>/ via core:place.
// Site reads content/manifest.json generated from this file (`npm run gen:manifest`).
//
// Fields:
//   from, version, origin, destination — workspaced input + place target
//   title, description               — site UI / llms headers
//   pipeline                         — astro-md | marked (src/lib/pipelines/)
//
// Do not edit content/manifest.json by hand.
#docs: {
	renovate: {
		from:        "github:renovatebot/renovate"
		origin:      "docs"
		destination: "renovate"
		title:       "Renovate"
		description: "Automated dependency updates. Configuration, usage, and development docs from the Renovate project."
		pipeline:    "astro-md"
	}
	opencv4: {
		from:        "github:opencv/opencv"
		version:     "4.x"
		origin:      "doc"
		destination: "opencv4"
		title:       "OpenCV 4"
		description: "OpenCV 4.x documentation and tutorials from the opencv/opencv 4.x branch (doc/)."
		pipeline:    "marked"
	}
	opencv5: {
		from:        "github:opencv/opencv"
		version:     "5.x"
		origin:      "doc"
		destination: "opencv5"
		title:       "OpenCV 5"
		description: "OpenCV 5.x documentation and tutorials from the opencv/opencv 5.x branch (doc/)."
		pipeline:    "marked"
	}
}

#docs: [string]: {
	from:        string | *""
	version:     string | *"HEAD"
	origin:      string | *"docs"
	destination: string | *""
	title:       string | *""
	description: string | *""
	pipeline:    "astro-md" | "marked" | *"astro-md"
}

// Site manifest JSON is generated from #docs by scripts/gen-manifest.mjs
// (npm run gen:manifest / prebuild). Keep all pack metadata and pipeline here only.

workspaced: {
	inputs: {
		for name, src in #docs {
			"docs_\(name)": {
				from:    src.from
				version: src.version
			}
		}
	}
	modules: {
		for name, value in #docs {
			"docs_\(name)": {
				from: "core:place"
				config: {
					items: {
						"content/\(value.destination)": "docs_\(name):\(value.origin)"
					}
				}
			}
		}
	}
}
