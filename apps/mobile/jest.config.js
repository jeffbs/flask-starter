/** Snapshot-/Komponententests laufen über jest-expo (RN-Runtime);
 *  reine Logik-Tests laufen separat über vitest (tests/). */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests-ui/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
};
