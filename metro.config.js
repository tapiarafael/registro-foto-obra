const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Metro prefers the ESM build for @pdf-lib/fontkit, which breaks default export interop in RN.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@pdf-lib/fontkit") {
    return {
      filePath: path.resolve(__dirname, "node_modules/@pdf-lib/fontkit/dist/fontkit.umd.js"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
