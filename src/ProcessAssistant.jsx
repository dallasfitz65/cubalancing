import React,{useState,useEffect} from 'react';
import {answerProcessQuestion,PROCESS_ASSISTANT_PROMPTS,PROCESS_TITLES} from './process-assistant.mjs';

export default function ProcessAssistant({module,report,enabled=false}){
 const [opened,setOpened]=useState(false),[question,setQuestion]=useState(''),[messages,setMessages]=useState([]);
 useEffect(()=>{setOpened(false);setQuestion('');setMessages([]);},[module,report]);
 if(!enabled||!PROCESS_TITLES[module])return null;
 const title=PROCESS_TITLES[module];
 function ask(value){
  const q=String(value||'').trim();
  if(!q)return;
  setMessages(items=>[...items,{question:q,answer:answerProcessQuestion(module,q,report)}]);
  setQuestion('');
 }
 return <div className="atm-assistant-dock">
  <button type="button" className="atm-chat-launcher" aria-controls="process-chat-window" aria-expanded={opened} onClick={()=>setOpened(v=>!v)}>{opened?'Close chat':'Ask the System'}{messages.length&&!opened?' · '+messages.length:''}</button>
  {opened&&<section className="atm-investigation atm-chat-window" id="process-chat-window" aria-label={title+' investigation chat'}>
   <div className="atm-chat-header"><h3>Ask the System</h3><button type="button" aria-label="Close investigation assistant" onClick={()=>setOpened(false)}>✕</button></div>
   <p className="atm-chat-subtitle">{title} · Local rules-based assistant</p>
   <p className="atm-chat-disclosure">Answers reference only this process's current browser report. Enterprise AI is not connected and no information is transmitted to an AI service. Findings do not certify unverified controls.</p>
   {!report&&<p role="status">No completed {title} report yet. Reconnect or scan the input folder in Settings → Folder Configuration.</p>}
   <div className="atm-chat-suggestions">{PROCESS_ASSISTANT_PROMPTS[module].map(q=><button type="button" key={q} onClick={()=>ask(q)}>{q}</button>)}</div>
   <div aria-live="polite" className="atm-chat-history" aria-label={title+' assistant conversation'}>{messages.map((item,i)=><div key={i}><p><strong>You:</strong> {item.question}</p><p><strong>Assistant:</strong> {item.answer}</p></div>)}</div>
   <form className="atm-chat-compose" onSubmit={e=>{e.preventDefault();ask(question);}}>
    <input aria-label={'Ask about '+title} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={'Ask about '+title+'…'}/>
    <button type="submit" className="primary" disabled={!question.trim()}>Ask</button>
   </form>
  </section>}
 </div>;
}
