#!/usr/bin/env node
// Drop expo-dev-client from Android store binaries. Keep it for local debug
// and the EAS "development" profile. iOS already marks these modules debugOnly.
const fs = require("fs");
const path = require("path");

const profile = process.env.EAS_BUILD_PROFILE;
if (profile !== "production") {
  process.exit(0);
}

const pkgPath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const exclude = [
  "expo-dev-client",
  "expo-dev-launcher",
  "expo-dev-menu",
  "expo-dev-menu-interface",
];

pkg.expo = pkg.expo || {};
pkg.expo.autolinking = pkg.expo.autolinking || {};
const android = pkg.expo.autolinking.android || {};
android.exclude = [...new Set([...(android.exclude || []), ...exclude])];
pkg.expo.autolinking.android = android;

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(
  `[eas-strip-dev-client] excluded from Android autolinking: ${exclude.join(", ")}`
);
