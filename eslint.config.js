import baseConfig from './packages/eslint-config/base.js';
import nextConfig from './packages/eslint-config/next.js';
import nodeConfig from './packages/eslint-config/node.js';
import reactNativeConfig from './packages/eslint-config/react-native.js';

// Keep the root configuration as composition only. Each environment owns its
// rules in the shared package, preventing web, mobile, and server rules from drifting.
export default [...baseConfig, ...nextConfig, ...nodeConfig, ...reactNativeConfig];
