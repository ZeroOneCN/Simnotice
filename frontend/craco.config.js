const path = require('path');

module.exports = {
  devServer: (devServerConfig) => {
    // Use our custom webpack dev server configuration
    const customConfig = require('./scripts/custom-webpack-config');
    
    // Merge with the default config but prioritize our custom setup
    return {
      ...devServerConfig,
      ...customConfig(devServerConfig.proxy, devServerConfig.allowedHosts),
    };
  },
};