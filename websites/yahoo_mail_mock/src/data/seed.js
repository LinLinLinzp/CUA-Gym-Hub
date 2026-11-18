import { seedFiles } from './files.js'
const fixed = '2025-06-10T16:00:00.000Z'
const pad = n => String(n).padStart(4,'0')
const custom = [['work','Work'],['q2launch','Q2 Launch','work'],['receipts','Receipts'],['travel','Travel'],['family','Family'],['bills','Bills'],['bookclub','Book Club'],['clients','Clients'],['research','Research','work'],['design','Design Reviews','work'],['finance','Finance'],['events','Events'],['hiring','Hiring'],['learning','Learning'],['health','Health'],['home','Home Renovation'],['insurance','Insurance'],['running','Running Club'],['schools','School Updates'],['taxes','Taxes'],['volunteer','Volunteering'],['warranties','Warranties','home'],['recipes','Recipes'],['music','Music']]
const people = ['Daniel Okafor','Priya Raman','Sofia Chen','Alex Morgan','Jordan Ellis','Noah Williams','Emma Patel','Oliver Kim','Ava Thompson','Ethan Clark','Mia Rodriguez','Leo Wilson','Hannah Brooks','Carol Brooks','Richard Brooks','Lucas Brooks','Emily Brooks','Olivia Bennett','James Cooper','Amelia Scott','Benjamin Lee','Charlotte Evans','Henry Adams','Isabella Turner','William Baker','Harper Mitchell','Jack Collins','Luis Ortega','Grace Dental','Sam Rivera','Aria Howard','Owen Hughes','Chloe Martin','Nora Lewis','Liam Walker','Ella Young','Mason Hall','Lily King','Logan Wright','Zoe Green','Caleb Hill','Layla Nelson','Sebastian Carter','Stella Reed','Wyatt Brooks','Community Team','Library Updates','Garden Notes']
const listNames=['Brightlane Launch Team','Family','Book Club','Running Club','Design Review','Product Partners','Research Panel','Client Leads','Finance Team','Event Hosts','Hiring Panel','Learning Circle','Health Providers','Home Project','Insurance Contacts','School Friends','Tax Advisors','Volunteer Crew','Warranty Support','Recipe Swap','Music Friends','Lisbon Trip','Weekend Plans','Neighborhood']
const personalMessages = {
  4: ['Priya Raman', 'Can you review the homepage concepts?', 'I narrowed the homepage down to two directions. Could you review the navigation in the attached concepts before we meet tomorrow?'],
  5: ['Lucas Brooks', 'Thursday team lunch', 'I booked a table for noon at the little noodle shop on Grand. Let me know if you’re bringing anyone.'],
  6: ['James Cooper', 'Q2 launch plan — final review Thursday', 'We have another launch plan to review on Thursday: the community workshops. Can you check the schedule before I send it to the hosts?'],
  9: ['Nora Lewis', '[Book Club] April reading selection', 'Our pick is The Left Hand of Darkness. We’ll meet at my place on April 14. I’ve got two extra copies if anyone needs one.'],
  12: ['Sofia Chen', 'Brand guidelines ready for review', 'The updated type scale and product illustration notes are ready. Can we review the accessibility examples before the team handoff?'],
  13: ['Alex Morgan', 'Weekly product notes', 'Two items for the design team this week: the simplified billing screen and the new demo account. I’ll add both to Friday’s agenda.'],
}
const subjectTopics=['Q2 launch plan — final review Thursday','Design feedback for the onboarding flow','Research synthesis — next steps','Updated timeline for the spring launch','Can you review the homepage concepts?','Thursday team lunch','Q2 launch plan — final review Thursday','Kitchen renovation quote and schedule','Your appointment is confirmed','[Book Club] April reading selection','Sunday dinner at our place','Lisbon trip — a few ideas','Brand guidelines ready for review','Weekly product notes','Workshop recap and resources','Running club — Saturday route','A few photos from the garden']
export function createInitialData() {
 const currentUser={id:'usr_megan',name:'Megan Brooks',firstName:'Megan',email:'megan.brooks@yahoo.com',aliases:['mbrooks.design@yahoo.com'],avatarColor:'#7E57C2',jobTitle:'Senior Product Designer',company:'Brightlane',location:'Oakland, CA',storage:{usedBytes:1288490188,totalBytes:21474836480}}
 const folders=[...['inbox','draft','sent','archive','spam','trash'].map((id,i)=>({id,name:['Inbox','Drafts','Sent','Archive','Spam','Trash'][i],type:'system',parentId:null,order:i,createdAt:fixed})),...custom.map(([id,name,parent],i)=>({id:'fld_'+id,name,type:'user',parentId:parent?'fld_'+parent:null,order:i,createdAt:fixed,updatedAt:null}))]
 const contacts=people.map((name,i)=>{const [firstName,...last]=name.split(' '); const email=name.toLowerCase().replaceAll(' ','.')+(i<12?'@brightlane.io':'@example.com');return {id:'ct_'+pad(i+1),firstName:i>=45?'':firstName,lastName:i>=45?'':last.join(' '),nickname:'',emails:[{type:i<12?'work':'personal',address:email},...(i%9===0?[{type:'personal',address:firstName.toLowerCase()+'.notes@example.com'}]:[])],phones:[{type:'mobile',number:`+1 (415) 555-${String(142+i).padStart(4,'0')}`}],company:i<12?'Brightlane':i===27?'Ortega Remodeling':'',jobTitle:i===0?'Product Marketing Lead':i===1?'Product Researcher':'',addresses:i%5===0?[{type:'work',street:'500 Howard St',city:'San Francisco',state:'CA',zip:'94105',country:'United States'}]:[],birthday:i%6===0?'1988-07-14':'',website:'',notes:i===0?'Owns launch communications.':'',isFavorite:i<8,avatarColor:['#5B8DB8','#C2185B','#00897B','#A07A40'][i%4],source:'manual',createdAt:fixed,updatedAt:null}})
 const contactLists=listNames.map((name,i)=>({id:'cl_'+pad(i+1),name,contactIds:(i===0?contacts.slice(0,6):i===1?contacts.slice(12,17):i===2?contacts.slice(33,38):i===3?contacts.slice(28,32):Array.from({length:2+i%7},(_,j)=>contacts[(i*2+j)%48])).map(c=>c.id),createdAt:fixed,updatedAt:null}))
 const rule=(value,operator='contains',matchCase=false)=>({operator,value,matchCase})
 const filterSpecs=[['Brightlane work','from',rule('@brightlane.io'),'fld_work'],['Receipts','subject',rule('order'),'fld_receipts'],['Book club','subject',rule('[Book Club]','begins with'),'fld_bookclub'],['Bills','from',rule('billing@'),'fld_bills'],['Junk promos','from',rule('.biz','ends with'),'trash'],...custom.slice(7).map(([id,name],i)=>[name,'subject',rule(['[Client]','[Research]','[Design Review]','[Finance]','[Event]','[Hiring]','[Learning]','[Health]','[Home]','[Insurance]','[Running]','[School]','[Tax]','[Volunteer]','[Warranty]','[Recipe]','[Music]'][i],'contains',i===2),'fld_'+id]),['Lisbon itinerary','subject',rule('Lisbon'),'fld_travel'],['Family updates','from',rule('hannah.brooks@'),'fld_family']]
 const filters=filterSpecs.map(([name,key,r,folderId],i)=>({id:'flt_'+pad(i+1),name,rules:{from:null,toCc:null,subject:null,body:null,[key]:r,...(i===22?{body:rule('confirmation')}: {})},action:{type:'move',folderId},createdAt:fixed,updatedAt:null}))
 const distribution=[['inbox',34,'primary'],['inbox',10,'offers'],['inbox',6,'social'],['inbox',9,'newsletters'],['sent',16],['draft',4],['archive',9],['spam',6],['trash',5],['fld_work',6],['fld_q2launch',4],['fld_receipts',6],['fld_travel',3],['fld_family',3],['fld_bills',3],['fld_bookclub',2],...custom.slice(7).map(([id])=>['fld_'+id,2])]
 const images=seedFiles.filter(f=>f.kind==='image'),docs=seedFiles.filter(f=>f.kind==='document')
 let sequence=0,att=0
 const messages=distribution.flatMap(([folderId,count,category='primary'])=>Array.from({length:count},(_,i)=>{const n=sequence++,id='msg_'+pad(n+1),c=contacts[(n*3)%contacts.length],received=folderId!=='sent'&&folderId!=='draft',date=new Date(Date.parse('2026-03-16T15:47:00.000Z')-n*17*60*60000).toISOString();
 let from={name:people[(n*3)%people.length],email:c.emails[0].address},subject=subjectTopics[i%subjectTopics.length],body=`Hi Megan,\n\nI wanted to share the latest update on ${subject.toLowerCase().replace(/[?]/g,'')}. Please take a look when you have a moment. Your feedback on the details would be very helpful before we finalize everything on Thursday.\n\nThanks,\n${from.name.split(' ')[0]}`
 if(folderId==='inbox'&&category==='offers'){from={name:['Northfield Outfitters','Lumen Home','Cedar Market'][i%3],email:`hello@${['northfieldoutfitters','lumenhome','cedarmarket'][i%3]}.com`};subject=['Your spring essentials are here','A little something for your home','Members get 20% off this weekend'][i%3];body='Find a new favorite for the season. Your member offer is available through Sunday.'}
 if(category==='social'){from={name:['Riverline','Neighborly','PaceClub'][i%3],email:'updates@community.example.com'};subject=['Daniel shared a new post','New conversations in your neighborhood','Your weekly running highlights'][i%3]}
 if(category==='newsletters'){from={name:['The Daily Hike','Market Morning','Design Digest'][i%3],email:'news@'+['thedailyhike','marketmorning','designdigest'][i%3]+'.com'};subject=['Five trails worth exploring this spring','Your Monday market briefing','Design systems we loved this week'][i%3]}
 if(folderId.startsWith('fld_')&&folderId!=='fld_work'&&folderId!=='fld_q2launch')subject=`${folders.find(f=>f.id===folderId)?.name} — ${['plans and confirmation','updated details'][i%2]}`
 if(folderId==='fld_family'){from={name:'Hannah Brooks',email:'hannah.brooks@example.com'};subject='Photos from our Sunday in the garden'}
 if(folderId==='fld_receipts')subject=`Your order #NF-${54210+i} has shipped`
 if(folderId==='fld_travel')subject=['Lisbon flight confirmation — May 9','Your Lisbon hotel reservation','Lisbon itinerary and confirmation'][i]
 if(folderId==='fld_bills'){from={name:['Bay Power','Oakland Water','FiberNet'][i],email:'billing@'+['baypower','oaklandwater','fibernet'][i]+'.com'};subject='Your March statement is ready'}
 if(folderId==='fld_bookclub')subject='[Book Club] '+['April reading selection','Meet at Nora’s on Tuesday'][i]
 if(folderId==='spam'){from={name:i===5?'The Daily Hike':'Prize Center',email:i===5?'news@thedailyhike.com':'winner@lotto-intl-claims.net'};subject=i===5?'Your weekend trail guide':'Claim notice — account verification requested'}
 if(folderId==='draft')subject=['Follow-up on the kitchen quote','Ideas for our Lisbon weekend','Re: Q2 launch plan — final review Thursday','Notes for next week'][i]
 if(folderId==='inbox'&&i<4&&category==='primary')subject='Q2 launch plan — final review Thursday'
 if(folderId==='inbox'&&category==='primary'&&personalMessages[i]){
   const [name, title, text]=personalMessages[i]
   const person=contacts[people.indexOf(name)]
   from={name,email:person.emails[0].address}
   subject=title
   body='Hi Megan,\n\n'+text+'\n\n'+name.split(' ')[0]
 }
 if(folderId==='inbox'&&category==='primary'&&i<4) {
   body=[
     'Hi Megan,\n\nI attached the final launch deck. Could you double-check the homepage screenshots and share feedback before our review on Thursday?\n\nThanks,\nDaniel',
     'The launch deck looks good from my side. I’ve added the final release dates to slide five and checked them against the project calendar.',
     'I can cover the first-run flow in the review. Please leave ten minutes for questions about the prototype.',
     'I added the support team’s questions about onboarding. Could we walk through the handoff at the end of the review?',
   ][i]
 }
 if(folderId==='inbox'&&category==='primary'&&i===7){
   from={name:'Luis Ortega',email:'luis.ortega@example.com'}
   subject='Kitchen renovation quote and schedule'
   body='Hi Megan,\n\nThe updated quote includes cabinet refacing and the new tile backsplash. We can start on April 6 if that works for you. I have attached the itemized estimate.\n\nLuis'
 }
 if(folderId==='inbox'&&category==='primary'&&i===8){
   from={name:'Grace Dental',email:'grace.dental@example.com'}
   body='Hi Megan, your cleaning is confirmed for April 8 at 10:30 a.m. Please arrive ten minutes early to update your insurance information.'
 }
 if(folderId==='inbox'&&category==='primary'&&[10,11].includes(i)){
   from={name:'Hannah Brooks',email:'hannah.brooks@example.com'}
   subject='Sunday dinner at our place'
   body=i===10?'Megan, can you make dinner at 6? Bring the lemon cake if you have time.':'Mom can bring a salad and Lucas will set the table. See you Sunday!'
 }
 if(folderId==='sent'&&i<10)subject='Re: '+(i===0?'Q2 launch plan — final review Thursday':i<4?subjectTopics[(i+15)%subjectTopics.length]:subjectTopics[i])
 if(folderId==='sent'&&[10,11].includes(i))subject='Fwd: Q2 launch plan — final review Thursday'
 if(folderId==='draft'&&i===3)body=''
 const linked=(folderId==='inbox'&&category==='primary'&&i<4)||(folderId==='sent'&&i===0)||(folderId==='draft'&&i===2)
 let attachments=[]
 const add=f=>attachments.push({...f,id:'att_'+pad(++att),source:'seed',sourceMessageId:null,sourceAttachmentId:null,uploadedAt:null})
 if((category==='primary'&&folderId==='inbox'&&i<8)||(folderId==='sent'&&i<3)||(folderId==='archive'&&i<3)||(folderId==='fld_q2launch'&&i<2)||(folderId==='fld_receipts'&&i<2)||folderId==='fld_travel'||(folderId==='draft'&&i===0))add(docs[(n+2)%docs.length])
 if(folderId==='fld_work'&&i<4)from={name:people[i],email:contacts[i].emails[0].address}
 if((folderId==='inbox'&&category==='primary'&&i===0)||(folderId==='sent'&&i===0))attachments[0]={...attachments[0],...seedFiles.find(file=>file.name==='Q2_Launch_Deck_v7.pdf')}
 if(folderId==='inbox'&&category==='primary'&&i===7)attachments[0]={...attachments[0],...seedFiles.find(file=>file.name==='Ortega_Kitchen_Quote.pdf')}
 if(folderId==='fld_receipts'&&i<2)attachments[0]={...attachments[0],...seedFiles.find(file=>file.name==='Order_Receipt.pdf')}
 if(folderId==='fld_travel')attachments[0]={...attachments[0],...seedFiles.find(file=>file.name==='Lisbon_Itinerary.pdf')}
 if(folderId==='fld_family'&&i<2)add(seedFiles.find(file=>file.name==='Family_Garden.jpg'))
 if((n>=126&&n%2===0)||(folderId==='inbox'&&[0,4,6].includes(i)&&category==='primary'))add(images[(n+i)%images.length])
 if(n>=126&&n%2===1)add(docs[n%docs.length])
 if(folderId==='sent'&&[10,11].includes(i)) {
   const original=seedFiles.find(file=>file.name==='Q2_Launch_Deck_v7.pdf')
   add(original)
   const first=seedFiles.find(file=>file.name==='Design_Explorations.png')
   add(first)
 }
 if(folderId.startsWith('fld_')&&![ 'fld_work','fld_q2launch' ].includes(folderId)&&!body.includes(subject))body='Hi Megan,\n\nHere are the details for '+subject+'. Please keep this confirmation for your records and let us know if anything changes.'
 if(folderId==='inbox'&&['social','newsletters'].includes(category))body=subject+'. See the highlights from this week and catch up on the latest updates in our community.'
 return {id,conversationId:linked?'cnv_0001':folderId==='sent'&&i>=1&&i<10?'cnv_'+pad(10+Math.floor((i<4?i+15:i)/2)):folderId==='sent'&&[10,11].includes(i)?'cnv_'+pad(200+i):folderId==='inbox'&&category==='primary'&&i<14&&i!==10&&i!==11?'cnv_'+pad(300+n):'cnv_'+pad(10+Math.floor(n/2)),folderId,previousFolderId:folderId==='trash'?(i===4?'fld_work':'inbox'):null,category,from:received?from:{name:currentUser.name,email:currentUser.email},to:received?[{name:currentUser.name,email:i%9===0?currentUser.aliases[0]:currentUser.email}]:folderId==='draft'&&[1,3].includes(i)?[]:[from],cc:received&&n%4===0?[{name:'Priya Raman',email:'priya.raman@brightlane.io'},{name:'Daniel Okafor',email:'daniel.okafor@brightlane.io'}]:[],bcc:[],replyTo:n===6?{name:'Daniel Okafor',email:'daniel.okafor@brightlane.io'}:null,subject,body,snippet:body.replace(/\s+/g,' ').slice(0,140),bodyHtml:null,date,isRead:!received||(category==='primary'&&folderId==='inbox'?i>=12:category==='offers'?i>=4:i%3!==0),isStarred:folderId==='inbox'&&category==='primary'?i<6:n%13===0,isDraft:folderId==='draft',status:folderId==='draft'?'draft':received?'received':'sent',attachments,hasImages:false,listUnsubscribe:category==='newsletters'||category==='offers'&&i<2,summary:n===0?'Daniel is asking for a final design review before Thursday’s Q2 launch meeting. Review the deck and share your feedback.':null,orderInfo:folderId==='fld_receipts'?{merchant:'Northfield Outfitters',orderNumber:'NF-'+(54210+i),total:(84.97+i*15).toFixed(2),currency:'USD',status:'Shipped',trackingNumber:'NF9842'+i}:null,travelInfo:folderId==='fld_travel'?{type:i===1?'hotel':'flight',provider:i===1?'Casa Lisboa':'Wind Airlines',confirmation:'LIS9MX'+i,departAt:'2026-05-09T18:30:00.000Z',from:'SFO',to:'LIS'}:null,inReplyToId:folderId==='sent'&&i<10?'msg_'+pad(i===0?1:i<4?i+16:i+1):folderId==='draft'&&i===2?'msg_0001':null,forwardedFromId:folderId==='sent'&&i>=10&&i<12?'msg_0001':null,replyType:folderId==='sent'&&i<10?'reply':folderId==='sent'&&i<12?'forward':folderId==='draft'&&i===2?'reply':null,repliedAt:null,forwardedAt:null,sentAt:folderId==='sent'?date:null,movedAt:null,appliedFilterId:folderId==='fld_work'&&i<4?'flt_0001':null,createdAt:date,updatedAt:null}
 }))
 // The primary inbox includes eight image-bearing messages; the remaining photos live with family and project mail.
 for(let i=0;messages.flatMap(m=>m.attachments).filter(a=>a.kind==='image').length<18;i++){const m=messages[126+i];m.attachments.push({...images[i%images.length],id:'att_'+pad(++att),source:'seed',sourceMessageId:null,sourceAttachmentId:null,uploadedAt:null})}
 const byId=new Map(messages.map(message=>[message.id,message]))
 for(const message of messages.filter(item=>item.inReplyToId)){
   message.conversationId=byId.get(message.inReplyToId).conversationId
   if(!message.isDraft)message.subject='Re: '+byId.get(message.inReplyToId).subject
 }
 for(const message of messages.filter(item=>item.forwardedFromId)){
   const original=byId.get(message.forwardedFromId)
   message.attachments=message.attachments.map(file=>({...file,source:'forward',sourceMessageId:original.id,sourceAttachmentId:original.attachments.find(source=>source.name===file.name)?.id||null}))
 }
 return {currentUser,folders,messages,contacts,contactLists,filters,blockedAddresses:[{id:'blk_0001',email:'deals@shopnowdaily.biz',createdAt:fixed,source:'settings'},{id:'blk_0002',email:'winner@lotto-intl-claims.net',createdAt:fixed,source:'settings'}],unsubscribes:[{id:'uns_0001',senderEmail:'news@coffeeclubmonthly.com',senderName:'Coffee Club Monthly',messageId:null,createdAt:fixed}],settings:{appearance:{theme:'light',themeColor:'purple',density:'comfortable',messageLayout:'list'},inbox:{categoriesEnabled:true,defaultCategory:'primary',showUnreadCount:true,sort:'date_desc'},viewing:{conversations:true,showImages:'ask',markAsRead:'immediately',afterMove:'next'},writing:{signature:{enabled:true,text:'Megan Brooks\nSenior Product Designer · Brightlane\n(415) 555-0199'},defaultFont:'sans-serif',defaultFontSize:'medium',defaultFrom:currentUser.email,sendWithCtrlEnter:true,linkPreviews:true},vacationResponse:{enabled:false,startDate:'',endDate:'',subject:'',message:'',onlyContacts:false,updatedAt:null},notifications:{browser:false,sound:false},ai:{messageSummaries:true},keyboardShortcuts:true,rightPanel:{open:true,tab:'starred'},sidebar:{compact:false,viewsExpanded:true,foldersExpanded:true,moreExpanded:false}},activityLog:[]}
}
