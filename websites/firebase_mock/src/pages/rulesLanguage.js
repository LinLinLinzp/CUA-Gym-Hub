export const operations = ['get', 'list', 'create', 'update', 'delete']
const aliases = { read: ['get', 'list'], write: ['create', 'update', 'delete'] }
const conditions = new Map([
  ['true', () => true],
  ['false', () => false],
  ['request . auth != null', (authenticated) => authenticated],
  ['request . auth == null', (authenticated) => !authenticated],
])

function tokenize(source) {
  const lexer = /\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[\w-]+|!=|==|&&|\|\||>=|<=|[{}()[\];:,./=+*?!<>%&|]/gy
  const tokens = []
  while (lexer.lastIndex < source.length) {
    const position = lexer.lastIndex
    const match = lexer.exec(source)
    if (!match) throw new Error(`Unexpected character on line ${source.slice(0, position).split('\n').length}.`)
    const token = match[0]
    if (!/^\s|^\/\/|^\/\*/.test(token)) tokens.push(token)
  }
  return tokens
}

export function inspectRules(source) {
  if (!source.trim()) return { error: 'Enter a rules policy.' }
  let unsupported = false
  const statements = []
  try {
    const tokens = tokenize(source)
    let position = 0
    const peek = (offset = 0) => tokens[position + offset]
    const take = () => tokens[position++]
    const accept = (expected) => {
      if (peek() !== expected) return false
      take()
      return true
    }
    const require = (expected) => {
      if (!accept(expected)) throw new Error(`Expected “${expected}” before ${peek() ? `“${peek()}”` : 'the end of the policy'}.`)
    }
    const requireName = () => {
      if (!/^[\w-]+$/.test(peek() ?? '')) throw new Error('Expected a name in the match path.')
      return take()
    }
    function readMatchPath() {
      const parts = []
      do {
        require('/')
        if (accept('{')) {
          requireName()
          if (accept('=')) { require('*'); require('*'); unsupported = true }
          require('}')
          parts.push(null)
        } else {
          let segment = requireName()
          while (accept('.')) segment += `.${requireName()}`
          parts.push(segment)
        }
      } while (peek() === '/')
      return parts
    }
    function readExpression() {
      const expression = []
      const stack = []
      const opens = { '(': ')', '[': ']', '{': '}' }
      while (peek() && (peek() !== ';' || stack.length)) {
        const token = take()
        if (opens[token]) stack.push(opens[token])
        else if ([')', ']', '}'].includes(token) && stack.pop() !== token) throw new Error('Check the expression and end the allow statement with a semicolon.')
        expression.push(token)
      }
      require(';')
      if (!expression.length || /^(?:[=!<>+*%&|/.-]|!=|==|&&|\|\|)$/.test(expression.at(-1))) {
        throw new Error('Enter a complete condition after “if”.')
      }
      if (expression.some((token) => token === 'allow' || token === 'match')) throw new Error('End each allow statement with a semicolon.')
      if (expression.some((token, i) => /^[\w-]+$/.test(token) && /^[\w-]+$/.test(expression[i + 1] ?? '') && !['in', 'is'].includes(token) && !['in', 'is'].includes(expression[i + 1]))) {
        throw new Error('Add an operator between values in the condition.')
      }
      return conditions.get(expression.join(' '))
    }
    function readFunction() {
      requireName()
      require('(')
      if (peek() !== ')') {
        do { requireName() } while (accept(','))
      }
      require(')')
      require('{')
      while (accept('let')) { requireName(); require('='); readExpression() }
      require('return')
      readExpression()
      require('}')
      unsupported = true
    }
    function readBlock(path, databaseRoot = false) {
      require('{')
      while (peek() && peek() !== '}') {
        if (accept('match')) {
          const nextPath = readMatchPath()
          if (databaseRoot) {
            if (nextPath.length !== 3 || nextPath[0] !== 'databases' || nextPath[1] !== null || nextPath[2] !== 'documents') unsupported = true
            readBlock([])
          } else readBlock([...path, ...nextPath])
        } else if (accept('allow')) {
          if (databaseRoot) throw new Error('Put allow statements inside a match block.')
          const allowed = []
          do {
            const operation = take()
            if (Object.hasOwn(aliases, operation)) allowed.push(...aliases[operation])
            else if (operations.includes(operation)) allowed.push(operation)
            else throw new Error('Choose a valid operation after “allow”.')
          } while (accept(','))
          require(':')
          require('if')
          const predicate = readExpression()
          if (!predicate) unsupported = true
          statements.push({ path, allowed, predicate })
        } else if (accept('function')) readFunction()
        else throw new Error(`Unexpected “${peek()}” in the rules block.`)
      }
      require('}')
    }
    if (accept('rules_version')) {
      require('=')
      if (!/^(['"])[12]\1$/.test(take() ?? '')) throw new Error('Choose rules version 1 or 2.')
      require(';')
    }
    require('service')
    require('cloud')
    require('.')
    require('firestore')
    readBlock([], true)
    if (peek()) throw new Error('Remove text after the service block.')
    return { statements, unsupported }
  } catch (error) {
    return { error: error.message }
  }
}

export function simulateRules(policy, operation, documentPath, authentication) {
  if (!documentPath.trim()) return { pathError: 'Enter a document path.' }
  const segments = documentPath.trim().replace(/^\//, '').split('/')
  if (segments.length % 2 || segments.some((part) => !part || part === '.' || part === '..')) {
    return { pathError: 'Use a collection/document path such as trailReports/report_001.' }
  }
  if (policy.error) return { tone: 'error', message: 'Fix the rule syntax before running the Playground.' }
  if (policy.unsupported) return { tone: 'warning', message: 'Unsupported · This draft uses rules outside the Playground subset.' }
  const allowed = policy.statements.some((rule) => rule.allowed.includes(operation) &&
    rule.path.length === segments.length && rule.path.every((chunk, i) => chunk === null || chunk === segments[i]) &&
    rule.predicate(authentication))
  return allowed ? { tone: 'success', message: 'Allow · This request is permitted.' }
    : { tone: 'error', message: 'Deny · No matching rule permits this request.' }
}
