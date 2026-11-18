const languages = [
  ['es', 'Spanish', 'Romance', 8200000, 'hola', 'agua', 'café', 'libro'],
  ['fr', 'French', 'Romance', 5920000, 'bonjour', 'eau', 'café', 'livre'],
  ['de', 'German', 'Germanic', 3810000, 'hallo', 'Wasser', 'Kaffee', 'Buch'],
  ['it', 'Italian', 'Romance', 3430000, 'ciao', 'acqua', 'caffè', 'libro'],
  ['ja', 'Japanese', 'Japonic', 6180000, 'こんにちは', '水', 'コーヒー', '本'],
  ['ko', 'Korean', 'Koreanic', 4580000, '안녕하세요', '물', '커피', '책'],
  ['pt', 'Portuguese', 'Romance', 2530000, 'olá', 'água', 'café', 'livro'],
  ['sv', 'Swedish', 'Germanic', 862000, 'hej', 'vatten', 'kaffe', 'bok'],
  ['nl', 'Dutch', 'Germanic', 957000, 'hallo', 'water', 'koffie', 'boek'],
  ['da', 'Danish', 'Germanic', 448000, 'hej', 'vand', 'kaffe', 'bog'],
  ['nb', 'Norwegian', 'Germanic', 584000, 'hei', 'vann', 'kaffe', 'bok'],
  ['fi', 'Finnish', 'Uralic', 370000, 'hei', 'vesi', 'kahvi', 'kirja'],
  ['pl', 'Polish', 'Slavic', 716000, 'cześć', 'woda', 'kawa', 'książka'],
  ['uk', 'Ukrainian', 'Slavic', 610000, 'привіт', 'вода', 'кава', 'книга'],
  ['ru', 'Russian', 'Slavic', 1890000, 'привет', 'вода', 'кофе', 'книга'],
  ['cs', 'Czech', 'Slavic', 318000, 'ahoj', 'voda', 'káva', 'kniha'],
  ['el', 'Greek', 'Hellenic', 1040000, 'γεια', 'νερό', 'καφές', 'βιβλίο'],
  ['ro', 'Romanian', 'Romance', 377000, 'salut', 'apă', 'cafea', 'carte'],
  ['hu', 'Hungarian', 'Uralic', 284000, 'szia', 'víz', 'kávé', 'könyv'],
  ['tr', 'Turkish', 'Turkic', 1420000, 'merhaba', 'su', 'kahve', 'kitap'],
  ['ar', 'Arabic', 'Semitic', 2430000, 'مرحبا', 'ماء', 'قهوة', 'كتاب'],
  ['he', 'Hebrew', 'Semitic', 552000, 'שלום', 'מים', 'קפה', 'ספר'],
  ['hi', 'Hindi', 'Indo-Aryan', 1290000, 'नमस्ते', 'पानी', 'कॉफ़ी', 'किताब'],
  ['zh', 'Mandarin Chinese', 'Sinitic', 3410000, '你好', '水', '咖啡', '书'],
  ['vi', 'Vietnamese', 'Austroasiatic', 743000, 'xin chào', 'nước', 'cà phê', 'sách'],
  ['id', 'Indonesian', 'Austronesian', 513000, 'halo', 'air', 'kopi', 'buku'],
  ['sw', 'Swahili', 'Bantu', 304000, 'jambo', 'maji', 'kahawa', 'kitabu'],
  ['cy', 'Welsh', 'Celtic', 422000, 'helo', 'dŵr', 'coffi', 'llyfr'],
  ['ga', 'Irish', 'Celtic', 661000, 'dia duit', 'uisce', 'caife', 'leabhar'],
  ['gd', 'Scottish Gaelic', 'Celtic', 296000, 'halò', 'uisge', 'cofaidh', 'leabhar'],
  ['ca', 'Catalan', 'Romance', 252000, 'hola', 'aigua', 'cafè', 'llibre'],
  ['eo', 'Esperanto', 'Constructed', 217000, 'saluton', 'akvo', 'kafo', 'libro'],
  ['ha', 'Hausa', 'Chadic', 111000, 'sannu', 'ruwa', 'kofi', 'littafi'],
  ['af', 'Afrikaans', 'Germanic', 192000, 'hallo', 'water', 'koffie', 'boek'],
  ['sq', 'Albanian', 'Albanian', 176000, 'përshëndetje', 'ujë', 'kafe', 'libër'],
  ['eu', 'Basque', 'Language isolate', 164000, 'kaixo', 'ura', 'kafea', 'liburua'],
]

const units = [
  ['First greetings', 'hello', 'Learn a greeting and start a conversation.'],
  ['At the table', 'water', 'Practice everyday words for food and drink.'],
  ['At the café', 'coffee', 'Build vocabulary for a quick café visit.'],
  ['Between the pages', 'book', 'Learn words for reading and study.'],
]

export function createCatalog() {
  const courses = languages.map(([languageCode, name, family, learners], index) => ({
    id: 'course-' + languageCode, name, languageCode, baseLanguage: 'English', family, learners,
    description: units[index % units.length][2],
  }))
  const lessons = languages.flatMap(([code, name, , , ...words], courseIndex) => units.map(([title, word], index) => {
    const answer = words[index]
    const options = [words[(index + 1) % 4], words[(index + 3) % 4]]
    const answerIndex = (courseIndex + index + 1) % 3
    options.splice(answerIndex, 0, answer)
    return {
      id: 'lesson-' + code + '-0' + (index + 1), courseId: 'course-' + code, order: index + 1,
      title, prompt: 'Choose the ' + name + ' word for “' + word + '”.', options, answerIndex, xp: 15,
    }
  }))
  return { courses, lessons }
}
