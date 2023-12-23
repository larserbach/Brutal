const InlineChunkHtmlPlugin = require("inline-chunk-html-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = (env, argv) => ({
  mode: argv.mode === "production" ? "production" : "development",

  // This is necessary because Figma's 'eval' works differently than normal eval
  devtool: argv.mode === "production" ? false : "inline-source-map",
  entry: {
    ui: "./src/ui.ts", // The entry point for your UI code
    main: "./src/main.ts", // This is the entry point for our plugin code.
  },
  module: {
    rules: [
      // Converts TypeScript code to JavaScript
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  // Webpack tries these extensions for you if you omit the extension like "import './file'"
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },

  // Tells Webpack to generate "ui.html" and to inline "ui.ts" into it
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/ui.html",
      filename: "ui.html",
      inlineSource: ".(js)$",
      chunks: ["ui"],
      inject: "body",
    }),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/ui/]),
  ],
});
