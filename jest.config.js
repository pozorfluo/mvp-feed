module.exports = {
    preset: 'ts-jest',
    roots : [
        "<rootDir>/src"
    ],
    testEnvironment: 'jest-environment-jsdom',
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    transformIgnorePatterns: ['^.+\\.js$'],
    collectCoverage: true,
};
