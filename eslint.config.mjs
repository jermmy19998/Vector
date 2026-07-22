import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "release/**", "node_modules/**", "tsconfig.tsbuildinfo"]),
  { rules: { "@typescript-eslint/no-explicit-any": "off", "@typescript-eslint/no-require-imports": "off", "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], "import/no-anonymous-default-export": "off" } },
]);
