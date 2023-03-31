module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ["plugin:vue/vue3-essential", "eslint:recommended", "@vue/typescript", "plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: 2020,
  },
  rules: {
    "max-len": [
      "error",
      {
        code: 150,
        ignoreComments: true,
        ignoreUrls: true,
      },
    ],
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "@typescript-eslint/ban-ts-ignore": 0,
    "no-unused-vars": 1,
    "vue/no-setup-props-destructure": 0,
    "no-setup-props-destructure": 0,
  },
  overrides: [
    {
      files: ["./src/**/__tests__/*.spec.{j,t}s", "./src/**/__mock__/*.{j,t}s"],
      env: {
        mocha: true,
      },
      rules: {
        "no-unused-expressions": 0,
        "vue/no-setup-props-destructure": 0,
        "no-setup-props-destructure": 0,
      },
    },
  ],
};
