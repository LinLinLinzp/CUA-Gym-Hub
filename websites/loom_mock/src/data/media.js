export const samples = Object.fromEntries([
  ['release-board', 'Release board', 42],
  ['sprint-notes', 'Sprint notes', 56],
  ['insights-report', 'Insights report', 73],
  ['support-queue', 'Support queue', 35],
  ['design-review', 'Design review', 64],
  ['onboarding-guide', 'Onboarding guide', 49],
].map(([key, label, duration]) => [key, {
  label, duration, poster: '/media/' + key + '.webp', video: '/media/' + key + '.mp4',
}]))

export const getSample = (key) => Object.hasOwn(samples, key) ? samples[key] : null
