import clipMetadata from './clipMetadata.js'

export const sampleClips = [
  ['wood-type', 'Wood type in motion', 'Print & lettering'],
  ['book-spine', 'The repaired spine', 'Books & archives'],
  ['woven-grid', 'A woven grid', 'Textile & pattern'],
  ['neon-night', 'After the last screening', 'Signs & cinema'],
  ['archive-drawer', 'From the archive drawer', 'Local history'],
  ['glaze-study', 'Glaze study', 'Clay & craft'],
].map(([id, title, category]) => ({
  id, title, category, coverUrl: `/covers/${id}.svg`,
  media: { url: `/media/${id}.webm`, name: `${id}.webm`, mimeType: 'video/webm', source: 'sample', ...clipMetadata[id] },
}))

export const coverChoices = sampleClips.map(({ coverUrl, title }) => ({ url: coverUrl, title }))
