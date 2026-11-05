#!/bin/zsh
set -eu
cd "$(dirname "$0")"
export PATH="/Users/arkliang/.local/share/forgeax-toolchain/engine-0.4.18-bin:/usr/bin:/bin:/usr/sbin:/sbin"
pnpm --version
pnpm exec forgeax dev start --headless false --json
