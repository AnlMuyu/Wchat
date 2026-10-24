const token = localStorage.getItem('token');
const me = localStorage.getItem('username');
const socket = io();

socket.emit('auth', token);

function postMoment(){
  fetch('/api/moment',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token, content:moment.value})
  }).then(loadMoments);
}

function loadMoments(){
  fetch('/api/moments').then(r=>r.json()).then(list=>{
    moments.innerHTML = list.map(m=>`
      <div class="item"><b>${m.username}</b>：${m.content}</div>
    `).join('');
  });
}

function loadHistory(){
  const to = toUser.value;
  fetch(`/api/history?token=${token}&user=${to}`).then(r=>r.json()).then(list=>{
    chat.innerHTML = list.map(m=>`
      <div class="${m.from_user===me?'right':'left'}">${m.content}</div>
    `).join('');
  });
}

function send(){
  const to = toUser.value;
  const content = msg.value;
  socket.emit('private_msg', { token, to, content });
  msg.value='';
  loadHistory();
}

socket.on('msg', ()=>loadHistory());
toUser.onchange = loadHistory;
loadMoments();