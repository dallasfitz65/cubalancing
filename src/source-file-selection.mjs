// Select one validated file per XP2 source role. Never resolve arbitrary duplicates.
// The synthetic ATM GL exception fixture must not displace the standard ATM GL.
export function selectUniqueSourceFiles(candidates,maximumSize=10*1024*1024){
 const groups=new Map();
 for(const item of candidates){
  if(item.status!=='identified'||!item.role||!item.file?.size||item.file.size>maximumSize)continue;
  const group=groups.get(item.role)||[];group.push(item.file);groups.set(item.role,group);
 }
 const files={},duplicates=new Set(),ignored=[];
 for(const [role,options] of groups){
  if(options.length===1){files[role]=options[0];continue;}
  if(role==='atm_gl'){
   const standard=options.filter(file=>file.name.toLowerCase()==='atm-gl.csv');
   const exceptions=options.filter(file=>file.name.toLowerCase()==='atm-gl-exception.csv');
   if(standard.length===1&&standard.length+exceptions.length===options.length){
    files[role]=standard[0];ignored.push(...exceptions.map(f=>f.name));continue;
   }
  }
  duplicates.add(role);
 }
 return {files,duplicates,ignored};
}
