const { defineConfig } = require('cypress')

module.exports = defineConfig({
  downloadsFolder: '/tmp/cypress/downloads',
  e2e: {
    fixturesFolder: false,
    specPattern: '**/*.cy.js',
    supportFile: false
  },
  retries: 0,
  screenshotsFolder: '/tmp/cypress/screenshots',
  video: false,
  videosFolder: '/tmp/cypress/videos'
})
