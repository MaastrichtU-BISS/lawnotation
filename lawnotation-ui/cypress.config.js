const { defineConfig } = require("cypress");
const { execSync } = require("child_process");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on, config) {
      on('task', {
        resetDatabase() {
          console.log(`Resetting database...`);

          try {
            execSync('npm run supabase:db:reset');

            console.log(`DB reset successful`);

            return true;
          } catch (error) {
            console.error(`DB reset failed`, error);
          }

          return false;
        },
      });

      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'firefox') {
          // launchOptions.preferences is a map of preference names to values
          // login is not working in firefox when testing_localhost_is_secure_when_hijacked is false
          launchOptions.preferences['network.proxy.testing_localhost_is_secure_when_hijacked'] = true;
        }

        return launchOptions;
      });
    }
  },
});
