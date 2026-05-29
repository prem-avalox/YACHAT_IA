const endpoint = process.env.AGENT_TEST_URL || 'http://localhost:3000/api/agent/chat';

const cases = [
  {
    name: 'Color grading + Ableton/Ozone',
    message: 'Una que me sirva para color grading y para produccion musical con mixing y mastering incluido, uso ableton live 12 suite con plugins pesados como el ozone 12',
    minRecommendations: 3,
    maxTopTotal: 1900,
    requiredTopTerms: ['64GB', 'RTX 4070', 'NVMe'],
  },
  {
    name: 'DaVinci Resolve + ProRes 422',
    message: 'quiero una computadora para poder hacer color grading en davinci resolve, trabajo con flujo de trabajo profesional y archivos en pro res 422',
    minRecommendations: 3,
    maxTopTotal: 1900,
    requiredTopTerms: ['64GB', 'RTX 4070', 'NVMe'],
  },
  {
    name: 'Ableton Live + Ozone',
    message: 'quiero una pc para producir musica en ableton live 12 suite con ozone y plugins pesados',
    minRecommendations: 3,
    maxTopTotal: 1600,
    requiredTopTerms: ['NVMe'],
    requiredTopAnyTerms: [['32GB', '64GB']],
  },
  {
    name: 'League of Legends',
    message: 'quiero una pc para jugar league of legends',
    minRecommendations: 3,
    maxTopTotal: 700,
    requiredTopTerms: ['16GB'],
    forbiddenTerms: ['RTX 4090', 'RX 7900 XTX'],
  },
  {
    name: 'PC gamer 1500',
    message: 'quiero una pc gamer de 1500',
    minRecommendations: 3,
    maxTopTotal: 1500,
    requiredTopAnyTerms: [['16GB', '32GB', '64GB']],
    forbiddenTerms: ['RTX 4090'],
  },
  {
    name: 'GPU para DaVinci',
    message: 'qué gpu me recomiendas para davinci resolve',
    minRecommendations: 3,
    fullBuild: false,
    componentCategory: 'Tarjeta grafica',
    requiredTopAnyTerms: [['RTX', 'Radeon', 'RX']],
  },
];

function productText(recommendation) {
  return (recommendation.products || [])
    .map((p) => `${p.categoria || ''} ${p.marca || ''} ${p.nombre || ''}`)
    .join(' ');
}

function allCategoriesPresent(recommendation) {
  const required = ['Procesador', 'Placa madre', 'Memoria RAM', 'Tarjeta grafica', 'Fuente de poder', 'Almacenamiento', 'Gabinete'];
  const found = new Set((recommendation.products || []).map((p) => p.categoria));
  return required.every((category) => found.has(category));
}

async function runCase(testCase, index) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `regression-${Date.now()}-${index}`,
      message: testCase.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const recommendations = payload.recommendations || [];
  const top = recommendations[0];
  const topText = top ? productText(top) : '';
  const errors = [];

  if (recommendations.length < testCase.minRecommendations) {
    errors.push(`expected at least ${testCase.minRecommendations} recommendations, got ${recommendations.length}`);
  }

  if (top && testCase.fullBuild !== false && !allCategoriesPresent(top)) {
    errors.push('top recommendation is missing one or more full-build categories');
  }

  if (top && testCase.componentCategory) {
    const products = top.products || [];
    if (products.length !== 1 || products[0].categoria !== testCase.componentCategory) {
      errors.push(`top recommendation should contain exactly one ${testCase.componentCategory}`);
    }
  }

  if (top && testCase.maxTopTotal && Number(top.total || 0) > testCase.maxTopTotal) {
    errors.push(`top total ${top.total} exceeds ${testCase.maxTopTotal}`);
  }

  for (const term of testCase.requiredTopTerms || []) {
    if (!topText.toLowerCase().includes(term.toLowerCase())) {
      errors.push(`top recommendation does not include "${term}"`);
    }
  }

  for (const terms of testCase.requiredTopAnyTerms || []) {
    const found = terms.some((term) => topText.toLowerCase().includes(term.toLowerCase()));
    if (!found) {
      errors.push(`top recommendation does not include any of: ${terms.map((term) => `"${term}"`).join(', ')}`);
    }
  }

  for (const term of testCase.forbiddenTerms || []) {
    if (topText.toLowerCase().includes(term.toLowerCase())) {
      errors.push(`top recommendation includes forbidden term "${term}"`);
    }
  }

  return {
    name: testCase.name,
    ok: errors.length === 0,
    errors,
    reply: payload.reply,
    top: top
      ? {
          label: top.label,
          total: top.total,
          products: top.products.map((p) => `${p.categoria}: ${p.nombre}`),
        }
      : null,
  };
}

const results = [];
for (let index = 0; index < cases.length; index += 1) {
  results.push(await runCase(cases[index], index));
}

let failures = 0;
for (const result of results) {
  if (!result.ok) failures += 1;
  console.log(`\n${result.ok ? 'PASS' : 'FAIL'} ${result.name}`);
  console.log(result.reply);
  if (result.top) {
    console.log(`Top: ${result.top.label} $${result.top.total}`);
    for (const product of result.top.products) console.log(`  - ${product}`);
  }
  for (const error of result.errors) console.log(`  ERROR: ${error}`);
}

if (failures > 0) {
  console.error(`\n${failures} regression case(s) failed.`);
  process.exit(1);
}

console.log('\nAll regression cases passed.');
