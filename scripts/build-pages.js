// Génère le site GitHub Pages (statique, sans serveur) dans dist/ (dossier ignoré par git, publié par .github/workflows/pages.yml)
// à partir de public/ et server/game.js. OUT=<dossier> pour écrire ailleurs (utilisé par npm test).
const fs=require('fs'),path=require('path'),ROOT=path.join(__dirname,'..'),OUT=path.resolve(ROOT,process.env.OUT||'dist');
const r=p=>p.startsWith('docs/')||p==='docs'?path.join(OUT,p.slice(5)):path.join(ROOT,p);
const copies=[['server/game.js','docs/game.js'],['server/game-config.js','docs/game-config.js'],['public/confidentialite.html','docs/confidentialite.html']];
for(const f of ['overlay.js','style.css','demo.css','controls.js','driver-local.js','icons.js','panels.js','favicon.svg']) copies.push(['public/'+f,'docs/'+f]);
fs.mkdirSync(r('docs/3d'),{recursive:true});
for(const f of ['main.js','boot.js','nomodule.js','style.css','three.module.js']) copies.push(['public/3d/'+f,'docs/3d/'+f]);
for(const [a,b] of copies) fs.copyFileSync(r(a),r(b));
const html=fs.readFileSync(r('public/sim.html'),'utf8').replace('<script src="driver-server.js"></script>','<script src="game-config.js"></script><script src="game.js"></script><script src="driver-local.js"></script>').replace('Twitch Colony — simulation','Twitch Colony — démo simulation');
fs.writeFileSync(r('docs/index.html'),html);
fs.writeFileSync(r('docs/3d/index.html'),fs.readFileSync(r('public/3d/index.html'),'utf8').replace('<script src="../driver-server.js"></script>','<script src="../driver-local.js"></script>'));
// Cache-busting : ?v=<empreinte du contenu> sur chaque script/feuille locale des pages HTML.
const crypto=require('crypto');
for(const page of ['docs/index.html','docs/3d/index.html']){
  const dir=path.dirname(r(page)); let h=fs.readFileSync(r(page),'utf8');
  h=h.replace(/(src|href)="([^"#?:]+\.(?:js|css))"/g,(m,a,f)=>{ const fp=path.join(dir,f); if(!fs.existsSync(fp)) return m; const v=crypto.createHash('sha1').update(fs.readFileSync(fp)).digest('hex').slice(0,8); return `${a}="${f}?v=${v}"`; });
  fs.writeFileSync(r(page),h);
}
console.log(`site Pages généré dans ${path.relative(ROOT,OUT)||'.'}/`);
