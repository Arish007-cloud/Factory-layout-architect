const fs=require('node:fs');
fs.mkdirSync('public',{recursive:true});
for(const file of ['index.html','app.js','styles.css'])fs.copyFileSync(file,'public/'+file);
console.log('Static application built in public/');
