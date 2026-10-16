// Génère docs/ (GitHub Pages, statique, sans serveur) à partir de public/ et server/game.js.
const fs=require('fs'),path=require('path'),r=p=>path.join(__dirname,'..',p);
const copies=[['server/game.js','docs/game.js'],['public/confidentialite.html','docs/confidentialite.html']];
for(const f of ['overlay.js','style.css','demo.css','controls.js','driver-local.js']) copies.push(['public/'+f,'docs/'+f]);
for(const [a,b] of copies) fs.copyFileSync(r(a),r(b));
const html=fs.readFileSync(r('public/sim.html'),'utf8').replace('<script src="driver-server.js"></script>','<script src="game.js"></script><script src="driver-local.js"></script>').replace('Twitch Colony — simulation','Twitch Colony — démo simulation');
fs.writeFileSync(r('docs/index.html'),html);
console.log('docs/ à jour');
