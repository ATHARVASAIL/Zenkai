#!/usr/bin/env bash
#
# ZENKAI — build the APK without Gradle or Android Studio.
#
# Needs a JDK (17 or newer) and four files in ./tools (see README.md):
#   android.jar, aapt2, d8.jar, uber-apk-signer.jar
#
# Signing: put your key's details in keystore.properties (see keystore.properties.example).
# Without it a new key is created in keystore/, which works for a fresh install but cannot
# update an app that was signed with a different key.
#
# Author: Atharva Sail
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

TOOLS="${TOOLS:-$ROOT/tools}"
PKG="app.systemzero"
VERSION_CODE="${VERSION_CODE:-10}"
VERSION_NAME="${VERSION_NAME:-6.2.1}"
MIN_SDK=26
TARGET_SDK=34
SRC="app/src/main"
OUT="$ROOT/build"

for f in android.jar aapt2 d8.jar uber-apk-signer.jar; do
  [ -e "$TOOLS/$f" ] || { echo "Missing $TOOLS/$f (see README.md)"; exit 1; }
done

# signing key: keystore.properties if present, otherwise a local key made on first build
KS_FILE="keystore/zenkai.jks"; KS_ALIAS="zenkai"; KS_PASS="android"; KEY_PASS="android"
if [ -f keystore.properties ]; then
  prop() { grep -E "^$1=" keystore.properties | head -n 1 | cut -d= -f2- | tr -d '\r'; }
  KS_FILE="$(prop storeFile)"; KS_ALIAS="$(prop keyAlias)"; KS_PASS="$(prop storePassword)"; KEY_PASS="$(prop keyPassword)"
fi
if [ ! -f "$KS_FILE" ]; then
  echo "No signing key at $KS_FILE, creating one (keep it: updates must be signed with the same key)"
  mkdir -p "$(dirname "$KS_FILE")"
  keytool -genkeypair -keystore "$KS_FILE" -alias "$KS_ALIAS" -storepass "$KS_PASS" -keypass "$KEY_PASS" \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=ZENKAI" > /dev/null
fi

rm -rf "$OUT"
mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/dex" "$OUT/signed"

echo "1/6 manifest"
sed "s|<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">|<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\" package=\"$PKG\">|" \
  "$SRC/AndroidManifest.xml" > "$OUT/AndroidManifest.xml"
grep -q "package=\"$PKG\"" "$OUT/AndroidManifest.xml"

echo "2/6 resources"
"$TOOLS/aapt2" compile --dir "$SRC/res" -o "$OUT/res.zip"
"$TOOLS/aapt2" link -o "$OUT/base.apk" -I "$TOOLS/android.jar" \
  --manifest "$OUT/AndroidManifest.xml" -A "$SRC/assets" --java "$OUT/gen" \
  --min-sdk-version "$MIN_SDK" --target-sdk-version "$TARGET_SDK" \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -0 .jpg -0 .webp -0 .woff2 "$OUT/res.zip"

echo "3/6 java"
# shellcheck disable=SC2046
javac -nowarn -source 8 -target 8 -bootclasspath "$TOOLS/android.jar" -d "$OUT/classes" \
  $(find "$SRC/java" "$OUT/gen" -name '*.java')

echo "4/6 dex"
# shellcheck disable=SC2046
java -cp "$TOOLS/d8.jar" com.android.tools.r8.D8 --release --min-api "$MIN_SDK" \
  --lib "$TOOLS/android.jar" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
(cd "$OUT/dex" && zip -q -0 ../base.apk classes.dex)

echo "5/6 align + sign"
java -jar "$TOOLS/uber-apk-signer.jar" -a "$OUT/base.apk" --allowResign \
  --ks "$KS_FILE" --ksAlias "$KS_ALIAS" --ksPass "$KS_PASS" --ksKeyPass "$KEY_PASS" \
  -o "$OUT/signed" > "$OUT/sign.log" 2>&1 || { cat "$OUT/sign.log"; exit 1; }

echo "6/6 done"
cp "$OUT"/signed/*.apk "$ROOT/ZENKAI.apk"
ls -l "$ROOT/ZENKAI.apk"
