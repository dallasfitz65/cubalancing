export function parseMappingCSV(text,width){
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw Error('Unexpected quote in CSV.');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(cell.trim());cell='';closed=false;if(c!==','){if(row.some(Boolean))rows.push(row);row=[];if(c==='\r'&&text[i+1]==='\n')i++;}}
  else{if(closed&&!/\s/.test(c))throw Error('Unexpected text after quoted value.');cell+=c;}
 }
 if(quoted)throw Error('Unclosed CSV quote.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 if(!rows.length||rows.length>10000||rows.some(r=>r.length!==rows[0].length)||!(Array.isArray(width)?width:[width]).includes(rows[0]?.length))throw Error(`Expected ${Array.isArray(width)?width.join(' or '):width} columns on every row, with 1–10,000 rows.`);
 return rows;
}
