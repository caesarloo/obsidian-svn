import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  // 构建产物、工具脚本与虚拟环境不是插件源码，不参与 lint
  globalIgnores([
    "node_modules",
    "dist",
    "coverage",
    ".venv",
    "main.js",
    "esbuild.config.mjs",
    "jest.config.js",
    "scripts/**"
  ]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.mjs"]
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    // 测试文件使用 jest mock，会触发针对生产代码才需要的类型规则
    files: ["**/*.test.ts"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off"
    }
  }
]);
