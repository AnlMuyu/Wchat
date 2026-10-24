function register() {
  fetch('/api/register', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      username: username.value,
      password: password.value,
      nickname: nickname.value
    })
  }).then(r=>r.json()).then(d=>alert(d.msg||d.error));
}

function login() {
  fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ username: username.value, password: password.value })
  }).then(r=>r.json()).then(d=>{
    if(d.token){
      localStorage.setItem('token', d.token);
      localStorage.setItem('username', d.username);
      location.href = 'home.html';
    } else alert(d.error);
  });
}