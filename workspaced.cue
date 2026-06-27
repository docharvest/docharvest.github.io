package workspaced

// Documentation packs placed via core:place under content/<destination>/.
// Each entry is one "tech" shown at /docs/:tech on the Astro site.
// `version` is the git ref (branch / tag / SHA) for the github input.
#docs: {
	renovate: {
		from:        "github:renovatebot/renovate"
		origin:      "docs"
		destination: "renovate"
		title:       "Renovate"
		description: "Automated dependency updates. Configuration, usage, and development docs from the Renovate project."
	}
	opencv4: {
		from:        "github:opencv/opencv"
		version:     "4.x"
		origin:      "doc"
		destination: "opencv4"
		title:       "OpenCV 4"
		description: "OpenCV 4.x documentation and tutorials from the opencv/opencv 4.x branch (doc/)."
	}
	opencv5: {
		from:        "github:opencv/opencv"
		version:     "5.x"
		origin:      "doc"
		destination: "opencv5"
		title:       "OpenCV 5"
		description: "OpenCV 5.x documentation and tutorials from the opencv/opencv 5.x branch (doc/)."
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
