// Copie la logique partagée dans docs/ (GitHub Pages, statique, sans serveur).
const fs=require('fs'),path=require('path'),r=p=>path.join(__dirname,'..',p);
for(const [a,b] of [['server/game.js','docs/game.js'],['public/overlay.js','docs/overlay.js'],['public/style.css','docs/style.css'],['public/confidentialite.html','docs/confidentialite.html']]) fs.copyFileSync(r(a),r(b));
console.log('docs/ à jour');
