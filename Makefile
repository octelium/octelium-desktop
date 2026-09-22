.PHONY: release release-major release-minor release-patch

release:
	@node scripts/release.mjs "$(VERSION)"

release-major:
	@node scripts/release.mjs major

release-minor:
	@node scripts/release.mjs minor

release-patch:
	@node scripts/release.mjs patch
