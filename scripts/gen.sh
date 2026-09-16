#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_DIR="${OCTELIUM_PB_DIR:-${ROOT}/../pb}"
OUT_DIR="${ROOT}/src/gen"
BIN_DIR="${ROOT}/node_modules/.bin"

if [ ! -f "${PB_DIR}/apis/protobuf/client/daemonv1/daemonv1.proto" ]; then
  echo "Could not find the Octelium protobuf APIs at ${PB_DIR}" >&2
  echo "Set OCTELIUM_PB_DIR to the root of the protobuf APIs repository" >&2
  exit 1
fi

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

"${BIN_DIR}/protoc" \
  --plugin=protoc-gen-ts="${BIN_DIR}/protoc-gen-ts" \
  --ts_out="${OUT_DIR}" \
  --ts_opt=long_type_number \
  --ts_opt=eslint_disable \
  --ts_opt=ts_nocheck \
  -I "${PB_DIR}" \
  "${PB_DIR}/apis/protobuf/client/daemonv1/daemonv1.proto"

mkdir -p "${OUT_DIR}/client"
mv "${OUT_DIR}/apis/protobuf/client/daemonv1" "${OUT_DIR}/client/daemonv1"
rm -rf "${OUT_DIR}/apis" "${OUT_DIR}/google"

for f in "${OUT_DIR}"/client/daemonv1/*.ts; do
  sed -i \
    -e 's|"\.\./\.\./main/metav1/metav1"|"@octelium/apis/main/metav1"|g' \
    -e 's|"\.\./\.\./\.\./\.\./google/protobuf/timestamp"|"@octelium/apis/google/protobuf/timestamp"|g' \
    "${f}"
done

cat > "${OUT_DIR}/client/daemonv1/index.ts" <<'EOT'
export * from "./daemonv1";
export * from "./daemonv1.client";
EOT

echo "Generated the daemon API into ${OUT_DIR}/client/daemonv1"
