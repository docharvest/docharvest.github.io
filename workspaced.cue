package workspaced

// Documentation packs placed via core:place under content/<destination>/.
// Each entry is one "tech" shown at /docs/:tech on the Astro site.
#docs: {
	renovate: {
		from:        "github:renovatebot/renovate"
		origin:      "docs"
		destination: "renovate"
		title:       "Renovate"
		description: "Automated dependency updates. Configuration, usage, and development docs from the Renovate project."
	}
}

#docs: [string]: {
	from:        string | *""
	version:     string | *"HEAD"
	origin:      string | *"docs"
	destination: string | *""
	title:       string | *""
	description: string | *""
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
