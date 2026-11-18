export const CONFIG_PATH = 'bitbucket-pipelines.yml'

export const STARTER_CONFIG = `image: node:22
pipelines:
  default:
    - step:
        name: Build and test
        caches:
          - node
        script:
          - npm ci
          - npm run build
          - npm test
`

function log(id, label, lines, status = 'successful', durationSeconds = 2) {
  return { id, label, status, durationSeconds, lines }
}

export function fixtureSteps(outcome = 'successful') {
  const failed = outcome === 'failed'
  const active = outcome === 'in_progress'
  return [
    { key: 'build', name: 'Build', fixtureStatus: 'successful', fixtureDurationSeconds: 7,
      fixtureLogSections: [log('setup', 'Build setup', ['Preparing the build environment', 'Checking out the target commit']), log('build', 'npm run build', ['Compiling application', 'Build completed'])] },
    { key: 'unit-tests', name: 'Unit tests', fixtureStatus: outcome, fixtureDurationSeconds: 14,
      fixtureLogSections: [log('test', 'npm test', failed ? ['Running 124 tests', 'FAIL src/network/retry.test.ts', 'Expected 3 attempts, received 4', '123 passed, 1 failed'] : active ? ['Running 124 tests', 'Waiting for the integration workers…'] : ['Running 124 tests', '124 passed, 0 failed'], outcome, 14)],
      retryFixtureStatus: 'successful', retryFixtureLogSections: [log('test-retry', 'npm test', ['Retrying the unit test step', '124 passed, 0 failed'], 'successful', 14)] },
    { key: 'artifacts', name: 'Publish artifacts', fixtureStatus: 'successful', fixtureDurationSeconds: 4,
      fixtureLogSections: [log('upload', 'Upload build artifacts', ['Collecting dist/', 'Artifacts uploaded'])] },
  ]
}
