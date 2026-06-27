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

// Derived site manifest — cue export . -e siteManifest --out json -o content/manifest.json
siteManifest: {
	packs: [
		for name, d in #docs {
			let id = [
				if d.destination != "" {d.destination},
				name,
			][0]
			let treeRef = [
				if d.version == "HEAD" {"main"},
				d.version,
			][0]
			let gh = [
				if len(d.from) > 7 && d.from[0:7] == "github:" {d.from[7:]},
				d.from,
			][0]
			{
				id:          id
				title:       [
					if d.title != "" {d.title},
					id,
				][0]
				description: d.description
				pipeline:    d.pipeline
				repo:        "https://github.com/\(gh)"
				source:      "https://github.com/\(gh)/tree/\(treeRef)/\(d.origin)"
			}
		},
	]
}

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
