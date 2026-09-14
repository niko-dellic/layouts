# Releasing Quilt

All three packages share a stable version. Release creation is explicit; ordinary merges never publish.

1. Create a branch and run `npm run release:version -- 0.1.1` (substitute the next version).
2. Add a `## 0.1.1` entry to `CHANGELOG.md`. Review the version and internal dependency changes, then merge a pull request after CI passes.
3. Open GitHub Actions → Release → Run workflow on `main`. Enter the committed version and leave **publish** unchecked to rehearse the complete release.
4. Run again with **publish** checked. Approve the `npm` environment deployment after verification succeeds.

The workflow tests and packs once, then publishes those exact archives in core → vanilla → React order. It checks the shared version, changelog, clean source commit, and artifact hashes. A retry accepts already-published packages only if their integrity matches, allowing recovery from a partially completed release. Never change an already-published version; bump again if contents differ. The original manually published 0.1.0 archives cannot be republished by this workflow.

Publishing uses npm trusted publishing with GitHub OIDC and automatic provenance. Each package trusts `niko-dellic/quilt`, workflow `release.yml`, environment `npm`, with direct publishing allowed. No npm token secret is needed. The environment is restricted to `main` and requires maintainer approval; the maintainer may approve their own manually triggered release.

On success the workflow creates a `v<version>` GitHub release with changelog notes and tarballs. If publication succeeds but GitHub release creation fails, rerun the same workflow run using its original commit. Release jobs are serialized to avoid concurrent publishing.

CI runs `npm run check` on pull requests and pushes under Node 24. The required `verify` check protects `main`; dependency updates arrive through weekly Dependabot pull requests.
