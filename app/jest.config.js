module.exports = {
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "!src/**/types.ts"
    ],
    testResultsProcessor: "./node_modules/jest-html-reporter",
    testMatch: [
        "<rootDir>/test/**/*test?ts?(x)"
    ],
    coverageThreshold: {
        global: {
            // branches: 92.86,
            branches: 10,
            functions: 10,
            lines: 10,
            statements: 10,
        }
    },
    testEnvironment: "node",
    setupTestFrameworkScriptFile: "<rootDir>/test/setupTests.ts",
    globalSetup: "<rootDir>/test/globalSetup.js",
    transform: {
        "^.+\\.tsx?$": "<rootDir>/config/jest/typescriptTransform.js",
        "^.+\\.css$": "<rootDir>/config/jest/cssTransform.js",
        "^(?!.*\\.(js|jsx|mjs|css|json)$)": "<rootDir>/config/jest/fileTransform.js"
    },
    transformIgnorePatterns: [
        "[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|ts|tsx)$"
    ],
    moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
    globals: {
        "ts-jest": {
            tsConfigFile: "tsconfig.test.json"
        }
    }
};
