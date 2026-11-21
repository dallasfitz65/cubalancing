import React from 'react';

// Reusable keyboard-accessible binary control, with no automatic persistence.
export default function SettingsSwitch({label,checked,onChange,disabled=false,id,description}){
 return <div className="settings-switch-row">
  <button id={id} type="button" role="switch" aria-label={label} aria-checked={checked}
   aria-describedby={description?String(id)+'-description':undefined}
   disabled={disabled} className={'settings-switch'+(checked?' settings-switch-on':'')}
   onClick={()=>onChange(!checked)}><span className="settings-switch-thumb"/></button>
  <span className="settings-switch-state">{checked?'On':'Off'}</span>
  {description&&<span id={String(id)+'-description'} className="settings-switch-description">{description}</span>}
 </div>;
}
