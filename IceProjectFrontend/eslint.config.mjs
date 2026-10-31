import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
      rules: {
      //  Allow `any` temporarily (no build blocking)
      "@typescript-eslint/no-explicit-any": "off",

      //  Don't block on unused vars (warn instead)
      "@typescript-eslint/no-unused-vars": ["warn"],

      //  Don't force exhaustive deps
      "react-hooks/exhaustive-deps": "off",

      //  Allow console logs for debugging
      "no-console": "off",

      // Disable some Next strict web-vitals warnings in dev
      "@next/next/no-img-element": "off",

      // Disable `@next/next/no-html-link-for-pages` if not needed
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default eslintConfig;
