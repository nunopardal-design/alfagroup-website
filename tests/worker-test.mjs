import assert from 'node:assert/strict';
import worker from '../src/index.js';

const deliveries=[];
const env={
 TO_EMAIL:'verified@example.net',
 FROM_EMAIL:'notices@alfagroup.pt',
 EMAIL:{send:async v=>{deliveries.push(v);return {messageId:'mock-id'}}},
 CONTACT_LIMIT:{limit:async()=>({success:true})},
 ASSETS:{fetch:async()=>new Response('asset')},
};
function req(fields={}, headers={}){
 const d=new FormData();
 const values={name:'Li Wei',company:'Shenzhen Test Ltd',email:'li.wei@example.cn',wechat:'liwei_sz',whatsapp:'+86 13800138000',message:'Hello Rui, nice to meet you.',website:'',t:String(Date.now()-10000),...fields};
 for (const [k,v] of Object.entries(values)) d.append(k,v);
 return new Request('https://alfagroup.pt/contact',{method:'POST',headers:{Origin:'https://alfagroup.pt',...headers},body:d});
}
let r=await worker.fetch(req(),env);assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});assert.equal(deliveries.length,1);assert.equal(deliveries[0].replyTo,'li.wei@example.cn');
assert.match(deliveries[0].text,/WeChat ID: liwei_sz\nWhatsApp: \+86 13800138000/);
r=await worker.fetch(req({whatsapp:''}),env);assert.equal(r.status,200);assert.match(deliveries[1].text,/WhatsApp: Not provided/);
r=await worker.fetch(req({whatsapp:'13800138000'}),env);assert.equal(r.status,422);
r=await worker.fetch(req({website:'spam'}),env);assert.equal(r.status,200);assert.deepEqual(await r.json(),{ok:true});assert.equal(deliveries.length,2);
r=await worker.fetch(req({name:''}),env);assert.equal(r.status,422);assert.deepEqual(await r.json(),{ok:false});
r=await worker.fetch(req({t:String(Date.now()-100)}),env);assert.equal(r.status,422);
r=await worker.fetch(req({}, {Origin:'https://foreign.example'}),env);assert.equal(r.status,403);
r=await worker.fetch(req({message:'x'.repeat(4001)}),env);assert.equal(r.status,422);
r=await worker.fetch(req({}, {'Sec-Fetch-Site':'cross-site'}),env);assert.equal(r.status,403);
r=await worker.fetch(new Request('https://alfagroup.pt/contact'),env);assert.equal(r.status,405);
r=await worker.fetch(req(),{...env,CONTACT_LIMIT:{limit:async()=>({success:false})}});assert.equal(r.status,429);
r=await worker.fetch(req(),{...env,TO_EMAIL:''});assert.equal(r.status,503);
r=await worker.fetch(new Request('https://alfagroup.pt/'),env);assert.equal(await r.text(),'asset');
console.log('PASS: Worker endpoint, WhatsApp, optional fields, and static route tests');
