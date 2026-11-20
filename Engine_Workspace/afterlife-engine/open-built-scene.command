#!/bin/zsh
set -eu
cd "$(dirname "$0")"
export PATH="/Users/arkliang/.local/share/forgeax-toolchain/engine-0.4.18-bin:/usr/bin:/bin:/usr/sbin:/sbin"
if [[ ! -f dist/forgeax-dist.json ]]; then
  node scripts/forgeax-native.mjs project build --target browser --json
fi
print 'Cyberpunk PDR: http://localhost:53664/ — keep this Terminal open while viewing.'
node scripts/forgeax-native.mjs project preview --port 53664 --json
