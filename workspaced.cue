package workspaced

// Documentation packs: single source of truth for vendoring + site metadata + pipeline.
// Place: content/<destination>/ via core:place.
// Manifest: .workspaced/config/content/manifest.json.tmpl on `workspaced codebase apply`
// (config-tree). Template reads module config.pack — inspect with:
//   workspaced codebase config dump
#docs: {
	renovate: {
		from:        "github:renovatebot/renovate"
		github:      "renovatebot/renovate"
		origin:      "docs"
		destination: "renovate"
		title:       "Renovate"
		description: "Automated dependency updates. Configuration, usage, and development docs from the Renovate project."
		pipeline:    "astro-md"
	}
	opencv4: {
		from:        "github:opencv/opencv"
		github:      "opencv/opencv"
		version:     "4.x"
		origin:      "doc"
		destination: "opencv4"
		title:       "OpenCV 4"
		description: "OpenCV 4.x documentation and tutorials from the opencv/opencv 4.x branch (doc/)."
		pipeline:    "marked"
	}
	opencv5: {
		from:        "github:opencv/opencv"
		github:      "opencv/opencv"
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
	// owner/repo for site links (no github: prefix)
	github:      string | *""
	version:     string | *"HEAD"
	origin:      string | *"docs"
	destination: string | *""
	title:       string | *""
	description: string | *""
	pipeline:    "astro-md" | "marked" | *"astro-md"
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
			let packId = [
				if value.destination != "" {value.destination},
				name,
			][0]
			let refForTree = [
				if value.version == "HEAD" {"main"},
				value.version,
			][0]
			"docs_\(name)": {
				from: "core:place"
				config: {
					items: {
						"content/\(packId)": "docs_\(name):\(value.origin)"
					}
					// Surfaced on config dump → template .root.modules.<name>.config.pack
					pack: {
						id:          packId
						title:       [
							if value.title != "" {value.title},
							packId,
						][0]
						description: value.description
						pipeline:    value.pipeline
						github:      value.github
						origin:      value.origin
						version:     value.version
						treeRef:     refForTree
					}
				}
			}
		}
	}
}
