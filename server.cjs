const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = {'/':'index.html','/index.html':'index.html','/app.js':'app.js','/styles.css':'styles.css'};
http.createServer((req,res)=>{
  const file=files[req.url.split('?')[0]];
  if(!file){res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
  res.setHeader('X-Content-Type-Options','nosniff');
  fs.createReadStream(path.join(__dirname,file)).pipe(res);
}).listen(4173,'127.0.0.1',()=>console.log('Factory Layout Architect: http://127.0.0.1:4173'));
