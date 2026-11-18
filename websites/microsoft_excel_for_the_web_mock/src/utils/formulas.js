import {address,colNumber,colName,coord} from './coordinates.js'
const REF=/^(?:(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_. ]*))!)?(\$?[A-Za-z]{1,3}\$?[1-9]\d*)(?![A-Za-z0-9_(])/;
export function tokenize(input) {
 const out=[];let s=input.startsWith('=')?input.slice(1):input;
 while(s.length){if(/^\s/.test(s)){s=s.trimStart();continue}let m;
 if((m=/^"((?:[^"]|"")*)"/.exec(s))){out.push({type:'string',value:m[1].replace(/""/g,'"'),raw:m[0]})}
 else if((m=REF.exec(s))){out.push({type:'ref',sheet:m[1]?.replace(/''/g,"'")??m[2],ref:m[3].toUpperCase(),raw:m[0]})}
 else if((m=/^(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?/.exec(s))){out.push({type:'number',value:+m[0],raw:m[0]})}
 else if((m=/^[A-Za-z_][A-Za-z_0-9.]*/.exec(s))){out.push({type:'name',value:m[0].toUpperCase(),raw:m[0]})}
 else if((m=/^(?:<>|<=|>=|[+\-*/^=<>(),:%]|#REF!)/.exec(s))){out.push({type:m[0],raw:m[0]})}
 else throw Error('#VALUE!');s=s.slice(m[0].length)
 }return out;
}
const quote=s=>`'${s.replace(/'/g,"''")}'`;
export function rewriteFormula(input, fn) {
 if(!String(input).startsWith('='))return input;
 // Token spans preserve spaces, identifiers and literal text exactly.
 let tokens;try{tokens=tokenize(input)}catch{return input}let pos=1,result='=';
 for(const t of tokens){const start=input.indexOf(t.raw,pos);result+=input.slice(pos,start)+(t.type==='ref'?fn(t):t.raw);pos=start+t.raw.length}return result+input.slice(pos)
}
export const renameReferences=(input,oldName,newName)=>rewriteFormula(input,t=>oldName && t.sheet?.toLowerCase()===oldName.toLowerCase()?`${quote(newName)}!${t.ref}`:t.raw)
export const translateFormula=(input,dr,dc)=>rewriteFormula(input,t=>{const m=/^(\$?)([A-Z]+)(\$?)(\d+)$/.exec(t.ref);const c=colNumber(m[2])+(m[1]?0:dc),r=+m[4]+(m[3]?0:dr);return c<1||r<1||c>16384||r>1048576?'#REF!':`${t.sheet?quote(t.sheet)+'!':''}${m[1]}${colName(c)}${m[3]}${r}`})
export function literal(input) {
 if(input==='')return {value:null,valueType:'blank',error:null,formula:null,dependencies:[]};
 if(input.startsWith("'"))return {value:input.slice(1),valueType:'string',error:null,formula:null,dependencies:[]};
 if(/^\d{4}-\d{2}-\d{2}$/.test(input)&&Number.isFinite(Date.parse(input))&&new Date(input).toISOString().slice(0,10)===input)return {value:input,valueType:'date',error:null,formula:null,dependencies:[]};
 if(/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?$/.test(input)&&Number.isFinite(+input))return {value:+input,valueType:'number',error:null,formula:null,dependencies:[]};
 if(/^(true|false)$/i.test(input))return {value:input.toLowerCase()==='true',valueType:'boolean',error:null,formula:null,dependencies:[]};
 return {value:input,valueType:'string',error:null,formula:null,dependencies:[]}
}

const precedence = {'=':1,'<>':1,'>':1,'<':1,'>=':1,'<=':1,'+':2,'-':2,'*':3,'/':3,'^':4}
export const signatures = {
  SUM:'SUM(number1, [number2], …)', AVERAGE:'AVERAGE(number1, [number2], …)',
  MIN:'MIN(number1, [number2], …)', MAX:'MAX(number1, [number2], …)',
  COUNT:'COUNT(value1, [value2], …)', COUNTA:'COUNTA(value1, [value2], …)',
  IF:'IF(logical_test, value_if_true, [value_if_false])', ROUND:'ROUND(number, num_digits)',
}
const fail = code => {throw Error(code)}
function parse(input) {
  const tokens = tokenize(input)
  let i = 0
  const take = type => {
    if (tokens[i]?.type !== type) return false
    return tokens[i++]
  }
  function primary() {
    const token = tokens[i++]
    if (!token) return fail('#VALUE!')
    if (token.type==='number' || token.type==='string') return {type:'literal',value:token.value}
    if (token.type==='#REF!') return {type:'error',error:'#REF!'}
    if (token.type==='+' || token.type==='-') return {type:'unary',op:token.type,value:expression(4)}
    if (token.type==='(') {
      const result=expression()
      if (!take(')')) return fail('#VALUE!')
      return result
    }
    if (token.type==='ref') {
      const end=take(':') && take('ref')
      if (tokens[i-1]?.type===':') return fail('#REF!')
      return {type:'reference',start:token,end}
    }
    if (token.type!=='name') return fail('#VALUE!')
    if (!take('(')) return token.value==='TRUE' || token.value==='FALSE' ?
      {type:'literal',value:token.value==='TRUE'} : {type:'error',error:'#NAME?'}
    const args=[]
    if (!take(')')) {
      do {args.push(expression())} while (take(','))
      if (!take(')')) return fail('#VALUE!')
    }
    return {type:'call',name:token.value,args}
  }
  function expression(min = 0) {
    let left=primary()
    while (take('%')) left={type:'unary',op:'%',value:left}
    while ((precedence[tokens[i]?.type] ?? -1)>=min) {
      const op=tokens[i++].type
      left={type:'binary',op,left,right:expression(precedence[op]+(op==='^'?0:1))}
    }
    return left
  }
  const ast=expression()
  if (i!==tokens.length) return fail('#VALUE!')
  return ast
}

export function mapReferences(input, mapper) {
  let tokens
  try {tokens=tokenize(input)} catch {return input}
  let offset=1, result='='
  for (let i=0;i<tokens.length;i++) {
    const token=tokens[i]
    const start=input.indexOf(token.raw,offset)
    result+=input.slice(offset,start)
    if (token.type!=='ref') {result+=token.raw;offset=start+token.raw.length;continue}
    const end=tokens[i+1]?.type===':' && tokens[i+2]?.type==='ref' ? tokens[i+2] : null
    const match=end?[token,end]:[token]
    const change=mapper(match)
    const last=end?input.indexOf(end.raw,input.indexOf(':',start+token.raw.length)+1)+end.raw.length:start+token.raw.length
    result+=change?.error ? change.error : change ? change.points.map((point,index)=>{
      const axes=/^(\$?)[A-Z]+(\$?)\d+$/.exec(match[index].ref)
      return `${index===0&&change.sheet?quote(change.sheet)+'!':''}${axes[1]}${colName(point.c)}${axes[2]}${point.r}`
    }).join(':') : input.slice(start,last)
    offset=last
    if (end) i+=2
  }
  return result+input.slice(offset)
}

const number = value => {
  if (value==null || value==='') return 0
  if (typeof value==='number' || typeof value==='boolean') return Number(value)
  return fail('#VALUE!')
}
const comparables = (a,b) => [
  typeof a==='string'?a.toLocaleLowerCase():a ?? (typeof b==='string'?'':0),
  typeof b==='string'?b.toLocaleLowerCase():b ?? (typeof a==='string'?'':0),
]
function binary(op,a,b) {
  if (Array.isArray(a)||Array.isArray(b)) return fail('#VALUE!')
  switch(op) {
    case '+':return number(a)+number(b)
    case '-':return number(a)-number(b)
    case '*':return number(a)*number(b)
    case '/':return number(b)===0?fail('#DIV/0!'):number(a)/number(b)
    case '^':return number(a)**number(b)
  }
  const [x,y]=comparables(a,b)
  switch(op) {
    case '=':return x===y
    case '<>':return x!==y
    case '>':return x>y
    case '<':return x<y
    case '>=':return x>=y
    case '<=':return x<=y
  }
}
function evaluate(node,reference) {
  const read = child => evaluate(child,reference)
  switch(node.type) {
    case 'literal':return node.value
    case 'error':return fail(node.error)
    case 'reference':return reference(node)
    case 'unary': {
      const value=number(read(node.value))
      return node.op==='%'?value/100:node.op==='-'?-value:value
    }
    case 'binary':return binary(node.op,read(node.left),read(node.right))
  }
  const {name,args}=node
  if (!Object.hasOwn(signatures,name)) return fail('#NAME?')
  if (name==='IF') {
    if (args.length<2 || args.length>3) return fail('#VALUE!')
    return read(args[0]) ? read(args[1]) : args.length===3 ? read(args[2]) : false
  }
  if (name==='ROUND') {
    if (args.length!==2) return fail('#VALUE!')
    const value=number(read(args[0]))
    const power=10**Math.trunc(number(read(args[1])))
    return Math.sign(value)*Math.round((Math.abs(value)+Number.EPSILON)*power)/power
  }
  const values=args.flatMap(arg=>[read(arg)].flat(Infinity))
  const nums=values.filter(value=>typeof value==='number')
  const sum=()=>nums.reduce((acc,value)=>acc+value,0)
  switch(name) {
    case 'SUM':return sum()
    case 'AVERAGE':return nums.length?sum()/nums.length:fail('#DIV/0!')
    case 'MIN':return nums.length?nums.reduce((a,b)=>Math.min(a,b)):0
    case 'MAX':return nums.length?nums.reduce((a,b)=>Math.max(a,b)):0
    case 'COUNT':return nums.length
    case 'COUNTA':return values.filter(value=>value!==null && value!=='').length
  }
}
function visitRefs(node,visit) {
  if (node.type==='reference') visit(node)
  if (node.left) visitRefs(node.left,visit)
  if (node.right) visitRefs(node.right,visit)
  if (node.type==='unary') visitRefs(node.value,visit)
  for (const arg of node.args || []) visitRefs(arg,visit)
}

export function workbookValues(state, workbookId) {
  const cells = (state.cells || []).filter(cell => cell.workbookId === workbookId)
  const missingCache = cells.some(cell => !Object.hasOwn(cell, 'value') || cell.valueType == null ||
    String(cell.input ?? cell.formula ?? '').startsWith('=') &&
      (!cell.formula || !Object.hasOwn(cell, 'error') || !Array.isArray(cell.dependencies)))
  if (!missingCache) return cells
  const derived = {cells: structuredClone(cells), sheets: state.sheets}
  recalculate(derived, workbookId)
  return derived.cells
}

export function recalculate(state, workbookId) {
  const cells=state.cells || []
  const sheets=state.sheets || []
  const sheetIds=new Map(sheets.map(sheet=>[sheet.id,sheet]))
  const sheetNames=new Map()
  for (const sheet of sheets) {
    const key=JSON.stringify([sheet.workbookId,sheet.name?.toLowerCase()])
    if (!sheetNames.has(key)||sheet.status!=='deleted') sheetNames.set(key,sheet)
  }
  const keyFor=(sheetId,label)=>JSON.stringify([sheetId,label])
  const map=new Map(cells.map(cell=>[keyFor(cell.sheetId,address(cell.row,cell.column)),cell]))
  const cache=new Map(), visiting=new Set()
  function calculate(cell) {
    if (cache.has(cell)) return cache.get(cell)
    if (visiting.has(cell)) return fail('#CIRC!')
    visiting.add(cell)
    const input=String(cell.input ?? cell.formula ?? cell.value ?? '')
    let result
    if (!input.startsWith('=')) result=literal(input)
    else {
      const dependencies=new Map()
      const storedDeps=()=>[...dependencies.values()]
      try {
        const ast=parse(input)
        const getSheet=(token,fallback)=>token.sheet ? sheetNames.get(JSON.stringify([cell.workbookId,token.sheet.toLowerCase()])) : fallback
        function resolve({start,end}) {
          const sheet=getSheet(start,sheetIds.get(cell.sheetId))
          const p=coord(start.ref), q=end?coord(end.ref):p
          if (!sheet || sheet.status==='deleted' || !p || !q || end && getSheet(end,sheet)?.id!==sheet.id) return fail('#REF!')
          const length=(Math.abs(p.r-q.r)+1)*(Math.abs(p.c-q.c)+1)
          if (length>100000) return fail('#REF!')
          const refs=[]
          for (let r=Math.min(p.r,q.r);r<=Math.max(p.r,q.r);r++) {
            for (let c=Math.min(p.c,q.c);c<=Math.max(p.c,q.c);c++) {
              const label=address(r,c), key=keyFor(sheet.id,label)
              dependencies.set(key,{sheetId:sheet.id,address:label})
              refs.push(key)
            }
          }
          return refs
        }
        visitRefs(ast,node=>{try {resolve(node)} catch {/* Deferred to the selected expression. */}})
        const value=evaluate(ast,node=>{
          const values=resolve(node).map(key=>{
            const target=map.get(key)
            if (!target) return null
            const entry=calculate(target)
            return entry.error?fail(entry.error):entry.value
          })
          return node.end?values:values[0]
        })
        if (Array.isArray(value)||typeof value==='number'&&!Number.isFinite(value)) fail('#VALUE!')
        result={formula:input,value,valueType:value===null?'blank':typeof value==='string'?'string':typeof value==='boolean'?'boolean':'number',error:null,dependencies:storedDeps()}
      } catch(error) {
        result={formula:input,value:null,valueType:'error',error:error.message?.startsWith('#')?error.message:'#VALUE!',dependencies:storedDeps()}
      }
    }
    visiting.delete(cell)
    cache.set(cell,result)
    return result
  }
  const changed=[]
  for (const cell of cells) {
    if (workbookId!=null && cell.workbookId!==workbookId) continue
    const result=calculate(cell)
    if (Object.keys(result).some(key=>JSON.stringify(cell[key])!==JSON.stringify(result[key]))) changed.push(cell.id)
    Object.assign(cell,result)
  }
  return changed
}
