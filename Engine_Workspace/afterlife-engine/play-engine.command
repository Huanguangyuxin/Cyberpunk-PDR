#!/bin/zsh
set -eu
cd "$(dirname "$0")"
export PATH="/Users/arkliang/.local/share/forgeax-toolchain/engine-0.4.18-bin:/usr/bin:/bin:/usr/sbin:/sbin"
pnpm exec forgeax project preview --json
