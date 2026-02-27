/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests/security"],
    testMatch: ["**/*.test.ts"],
    transform: {
        "^.+\\.tsx?$": ["ts-jest", {
            tsconfig: "tsconfig.json",
            // Bypass Motia complexities for straight testing
            diagnostics: false
        }]
    },
    setupFilesAfterEnv: ["<rootDir>/tests/security/jest.setup.ts"],
    testTimeout: 30000,
    verbose: true,
};
