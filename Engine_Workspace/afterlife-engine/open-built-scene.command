#!/bin/zsh
set -eu
cd "$(dirname "$0")"
export PATH="/Users/arkliang/.local/share/forgeax-toolchain/engine-0.4.18-bin:/usr/bin:/bin:/usr/sbin:/sbin"
if [[ ! -f dist/forgeax-dist.json ]]; then
  pnpm exec forgeax project build --target browser --json
fi
print 'Cyberpunk PDR: http://localhost:53664/ — keep this Terminal open while viewing.'
pnpm exec forgeax project preview --port 53664 --json
