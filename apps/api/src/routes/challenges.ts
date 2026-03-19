import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import vm from 'vm'
import { prisma } from '../utils/prisma'
import { requireAuth } from '../middlewares/auth'
import { ChallengeLanguage } from '@prisma/client'

// ─── Sandbox seguro via Node.js vm ────────────────────────────────────────────
// Executa código JS do usuário em contexto isolado com timeout.
// Para Python/C no futuro: spawn de processo filho com restrições de recursos.

function runInSandbox(code: string, testFn: string, fnName: string, timeoutMs = 3000): TestResult[] {
  const sandbox = { results: [] as TestResult[], console: { log: () => {} } }

  const script = `
    (function() {
      try {
        ${code}
        ${testFn}
        results = runTests(${fnName});
      } catch(e) {
        results = [{ ok: false, input: '', expected: '', got: 'Erro de execução: ' + e.message }];
      }
    })();
  `

  try {
    vm.runInNewContext(script, sandbox, { timeout: timeoutMs })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return [{ ok: false, input: '', expected: '', got: msg.includes('timed out') ? 'Tempo limite excedido (3s)' : `Erro: ${msg}` }]
  }

  return sandbox.results
}

interface TestResult {
  ok: boolean
  input: string
  expected: string
  got: string
}

// ─── Banco de desafios (JS — migrado de leetcode.js) ──────────────────────────
// Em produção estes dados viriam de uma tabela `challenges` no banco.
// Por ora ficam em memória para facilitar o primeiro deploy.
const CHALLENGES: Record<string, { id: string; title: string; difficulty: string; tags: string[]; description: string; starterCode: string; testFn: string; fnName: string }> = {
  js_twosum: {
    id: 'js_twosum', title: 'Dois Somas', difficulty: 'easy', tags: ['array', 'hash'],
    description: 'Dados um array de inteiros e um target, retorne os índices dos dois números que somam o target.',
    starterCode: 'function twoSum(nums, target) {\n  // sua solução\n}',
    testFn: `function runTests(fn){var c=[{a:[[2,7,11,15],9],e:[0,1]},{a:[[3,2,4],6],e:[1,2]},{a:[[3,3],6],e:[0,1]}];return c.map(function(t){try{var r=fn(t.a[0],t.a[1]);var ok=JSON.stringify((r||[]).slice().sort(function(a,b){return a-b}))===JSON.stringify(t.e.slice().sort(function(a,b){return a-b}));return{ok:ok,input:JSON.stringify(t.a[0])+' target='+t.a[1],expected:JSON.stringify(t.e),got:JSON.stringify(r)};}catch(e){return{ok:false,input:'',expected:JSON.stringify(t.e),got:'Erro: '+e.message};}});}`,
    fnName: 'twoSum',
  },
  js_palindrome: {
    id: 'js_palindrome', title: 'Palíndromo', difficulty: 'easy', tags: ['string', 'math'],
    description: 'Dado um inteiro x, retorne true se for palíndromo.',
    starterCode: 'function isPalindrome(x) {\n  \n}',
    testFn: `function runTests(fn){var c=[{a:121,e:true},{a:-121,e:false},{a:10,e:false},{a:0,e:true},{a:12321,e:true}];return c.map(function(t){try{var r=fn(t.a);return{ok:r===t.e,input:String(t.a),expected:String(t.e),got:String(r)};}catch(e){return{ok:false,input:String(t.a),expected:String(t.e),got:'Erro: '+e.message};}});}`,
    fnName: 'isPalindrome',
  },
  js_fizzbuzz: {
    id: 'js_fizzbuzz', title: 'FizzBuzz', difficulty: 'easy', tags: ['math', 'string'],
    description: 'Dado n, retorne array de strings com FizzBuzz.',
    starterCode: 'function fizzBuzz(n) {\n  \n}',
    testFn: `function runTests(fn){var c=[{n:5,e:["1","2","Fizz","4","Buzz"]},{n:3,e:["1","2","Fizz"]},{n:15,e:["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]}];return c.map(function(t){try{var r=fn(t.n);return{ok:JSON.stringify(r)===JSON.stringify(t.e),input:'n='+t.n,expected:JSON.stringify(t.e.slice(0,4))+'...',got:JSON.stringify((r||[]).slice(0,4))+'...'};}catch(e){return{ok:false,input:'n='+t.n,expected:'...',got:'Erro: '+e.message};}});}`,
    fnName: 'fizzBuzz',
  },
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const submitSchema = z.object({
  lang: z.nativeEnum(ChallengeLanguage),
  code: z.string().min(1).max(10000),
})

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const list = Object.values(CHALLENGES).map(({ testFn: _t, fnName: _f, ...c }) => c)
  res.json({ challenges: list })
})

router.get('/progress', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subs = await prisma.challengeSubmission.findMany({
      where: { userId: req.user!.sub },
      orderBy: { submittedAt: 'desc' },
      distinct: ['challengeId'],
    })
    const progress: Record<string, boolean> = {}
    for (const s of subs) progress[s.challengeId] = s.passed
    res.json({ progress })
  } catch (err) { next(err) }
})

router.get('/:id', (req: Request, res: Response) => {
  const c = CHALLENGES[req.params['id']!]
  if (!c) return res.status(404).json({ error: 'Desafio não encontrado' })
  const { testFn: _t, fnName: _f, ...challenge } = c
  res.json({ challenge: { ...challenge, starterCode: c.starterCode } })
})

router.post('/:id/submit', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lang, code } = submitSchema.parse(req.body)
    const challenge = CHALLENGES[req.params['id']!]
    if (!challenge) return res.status(404).json({ error: 'Desafio não encontrado' })

    let testResults: TestResult[]

    if (lang === 'javascript') {
      testResults = runInSandbox(code, challenge.testFn, challenge.fnName)
    } else {
      // Python/C: placeholder — implementar com child_process + Docker em Fase 4
      return res.status(501).json({ error: `Suporte a ${lang} em breve` })
    }

    const passed = testResults.every((r) => r.ok)

    const submission = await prisma.challengeSubmission.create({
      data: {
        userId: req.user!.sub,
        challengeId: challenge.id,
        lang,
        code,
        passed,
        testResults,
      },
    })

    res.json({ submission, testResults, passed })
  } catch (err) { next(err) }
})

export default router
