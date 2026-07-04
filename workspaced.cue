package workspaced

// Documentation packs: vendoring, site metadata, and render pipeline.
// Place: content/<destination>/ via core:place.
// Manifest: .workspaced/config/content/manifest.json.tmpl on `workspaced codebase apply`
// (config-tree). Template reads module config.pack; inspect with:
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
	svelte: {
		from:        "github:sveltejs/svelte"
		github:      "sveltejs/svelte"
		origin:      "documentation/docs"
		destination: "svelte"
		title:       "Svelte"
		description: "Svelte documentation (runes, template syntax, runtime) from sveltejs/svelte documentation/docs."
		// marked: Astro MD chokes on some Svelte frontmatter (e.g. tags); fences still get Shiki via finalizeDocHtml
		pipeline:    "marked"
	}
	nix: {
		from:        "github:NixOS/nix"
		github:      "NixOS/nix"
		version:     "master"
		origin:      "doc/manual/source"
		destination: "nix"
		title:       "Nix"
		description: "Nix package manager manual (source) from NixOS/nix on master."
		pipeline:    "marked"
	}
	nixpkgs: {
		from:        "github:NixOS/nixpkgs"
		github:      "NixOS/nixpkgs"
		version:     "master"
		origin:      "doc"
		destination: "nixpkgs"
		title:       "Nixpkgs"
		description: "Nixpkgs documentation from NixOS/nixpkgs on master (doc/)."
		pipeline:    "marked"
	}
	nixos: {
		from:        "github:NixOS/nixpkgs"
		github:      "NixOS/nixpkgs"
		version:     "master"
		origin:      "nixos/doc/manual"
		destination: "nixos"
		title:       "NixOS"
		description: "NixOS manual from NixOS/nixpkgs on master (nixos/doc/manual)."
		pipeline:    "marked"
	}
	astro: {
		from:        "github:withastro/docs"
		github:      "withastro/docs"
		version:     "main"
		origin:      "src/content/docs/en"
		destination: "astro"
		title:       "Astro"
		// marked (+ .mdx): Starlight/~/components imports cannot compile under this site
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
					// On config dump: template .root.modules.<name>.config.pack
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
