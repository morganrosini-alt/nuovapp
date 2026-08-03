module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|phosphor-react-native|@firebase/.*|firebase))",
  ],
  setupFilesAfterEnv: ["<rootDir>/__test__/setup.js"],
  testMatch: ["<rootDir>/__test__/**/*.test.tsx"],
};
