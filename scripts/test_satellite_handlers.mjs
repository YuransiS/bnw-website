import { GET as getVictoria } from '../../victoria-mc/src/app/api/v1/discovery/route.ts';
import { GET as getSvitlana } from '../../SvitlanaTapes/src/app/api/v1/discovery/route.ts';
import { GET as getAnastasia } from '../../anastasia-sych/src/app/api/v1/discovery/route.ts';
import { GET as getEconomica } from '../../economica/src/app/api/v1/discovery/route.ts';
import { GET as getNesoniaa } from '../../nesoniaa/src/app/api/v1/discovery/route.ts';
import { GET as getCleanKlinom } from '../../clean-klinom/src/app/api/v1/discovery/route.ts';
import { GET as getSergiy } from '../../sergiy-chernyavskyy/src/app/api/v1/discovery/route.ts';
import { GET as getViktoriaCh } from '../../viktoria-chernysh/src/app/api/v1/discovery/route.ts';

console.log('=== Testing all local satellite discovery route handlers ===');

const handlers = [
  { name: 'victoria', fn: getVictoria },
  { name: 'svitlana', fn: getSvitlana },
  { name: 'anastasia_sych', fn: getAnastasia },
  { name: 'economica', fn: getEconomica },
  { name: 'nesoniaa', fn: getNesoniaa },
  { name: 'clean_klinom', fn: getCleanKlinom },
  { name: 'sergiy', fn: getSergiy },
  { name: 'viktoria_chernysh', fn: getViktoriaCh }
];

for (const h of handlers) {
  const res = await h.fn();
  const data = await res.json();
  console.log(`[OK] ${h.name.padEnd(18)} -> Project: ${data.project_name}, Pages: ${data.pages_count}, Domain: ${data.domain}`);
}
console.log('\nAll satellite discovery endpoints executed successfully!');
