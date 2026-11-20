#!/bin/zsh
set -eu
cd "$(dirname "$0")"
export PATH="/Users/arkliang/.local/share/forgeax-toolchain/engine-0.4.18-bin:/usr/bin:/bin:/usr/sbin:/sbin"
node scripts/forgeax-native.mjs project preview --json
