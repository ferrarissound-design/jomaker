import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for(const dir of ['src','scripts','tests'])for(const file of readdirSync(dir))if(file.endsWith('.js'))execFileSync(process.execPath,['--check',`${dir}/${file}`],{stdio:'inherit'});
console.log('JavaScript syntax checks passed');
