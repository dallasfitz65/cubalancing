// Resolve confirmation from Identity's authenticated /user response when the
// SDK returns JWT-only claims. Never infer verification from an email address.
export async function verifiedIdentity(request,{getUser,fetchUser=fetch,siteURL=process.env.URL}={}){
 const user=await getUser();if(user?.id&&user.confirmedAt)return user;
 const cookie=request.headers.get('cookie')||'';
 const token=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('nf_jwt='))?.slice(7);
 if(!token||!siteURL)return null;
 try{const response=await fetchUser(new URL('/.netlify/identity/user',siteURL),{headers:{Authorization:'Bearer '+decodeURIComponent(token)},signal:AbortSignal.timeout(5000)});if(!response.ok)return null;const full=await response.json();if(!full.id||!full.email||!full.confirmed_at)return null;if(user?.id&&user.id!==full.id)return null;return {id:full.id,email:full.email,confirmedAt:full.confirmed_at};}catch{return null;}
}
