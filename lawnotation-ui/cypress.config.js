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
    }
  },
});
